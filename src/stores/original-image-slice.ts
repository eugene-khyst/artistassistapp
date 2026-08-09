/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type {StateCreator} from 'zustand';

import {
  deleteImageFileAndColorMixturesByDigest,
  getRecentImages,
  hasImageFile,
  saveNewImageFiles,
  touchImage,
} from '@/services/db/image-file-db';
import {
  blobToImageFile,
  type ImageFile,
  imageFileToFile,
  type RecentImage,
} from '@/services/image/image-file';
import type {SampleImageDefinition} from '@/services/image/sample-images';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import {persistChange} from '@/stores/sync/persist-change';
import {TabKey} from '@/tabs';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {createImageBitmapAndResize, IMAGE_SIZE, ResizeImage} from '@/utils/graphics';
import {isAbortError} from '@/utils/promise';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {PaletteSlice} from './palette-slice';
import type {TabSlice} from './tab-slice';

const REFERENCE_IMAGE_TIMEOUT_MS = 120_000;
const RECENT_IMAGES_PAGE_SIZE = 12;

type SelectImageResult = 'selected' | 'unreadable' | 'aborted';

export interface ProcessedImageHandle {
  abort?: () => void;
  clear?: () => void;
}

const processedImageHandles: ProcessedImageHandle[] = [];

export function registerProcessedImage(handle: ProcessedImageHandle): void {
  processedImageHandles.push(handle);
}

function abortAndClearProcessedImages(): void {
  for (const {abort} of processedImageHandles) {
    abort?.();
  }
  for (const {clear} of processedImageHandles) {
    clear?.();
  }
}

export interface OriginalImageSlice {
  selectedImageFile: ImageFile | null;
  recentImages: RecentImage[];

  originalImage: ImageBitmap | null;
  isOriginalImageLoading: boolean;
  isRecentImagesLoading: boolean;
  isSampleImageLoading: boolean;
  hasMoreRecentImages: boolean;

  selectImageFile: (
    imageFile: ImageFile | null,
    options?: {
      setActiveTabKey?: boolean;
      suppressReadError?: boolean;
    }
  ) => Promise<SelectImageResult>;
  selectRecentImage: (image: RecentImage) => Promise<void>;
  loadRecentImages: () => Promise<void>;
  loadMoreRecentImages: () => Promise<void>;
  selectLatestImageFile: () => Promise<void>;
  saveRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  deleteRecentImage: (digest: string, options?: {scheduleCloudPush?: boolean}) => Promise<void>;
  loadSampleImage: (sampleImage: SampleImageDefinition) => Promise<void>;
}

function toImageFile(image: RecentImage): ImageFile | null {
  const {blob} = image;
  return blob ? {...image, blob} : null;
}

function hasDigestSequence(images: RecentImage[], digests: string[]): boolean {
  return (
    images.length === digests.length && images.every(({digest}, index) => digest === digests[index])
  );
}

export const createOriginalImageSlice: StateCreator<
  OriginalImageSlice & TabSlice & ColorMixerSlice & PaletteSlice & CloudSlice & AppSlice,
  [],
  [],
  OriginalImageSlice
> = (set, get) => {
  const selectImageOperation = createAbortableOperation({
    onStart: () => {
      set({
        isOriginalImageLoading: true,
      });
    },
    onFinish: () => {
      set({
        isOriginalImageLoading: false,
      });
    },
  });

  const replaceRecentImages = async (limit: number): Promise<void> => {
    const {images, hasMore} = await getRecentImages(0, limit);
    set({
      recentImages: images,
      hasMoreRecentImages: hasMore,
    });
  };

  const removeRecentImage = (digestToDelete: string): void => {
    set(({recentImages}) => ({
      recentImages: recentImages.filter(({digest}) => digest !== digestToDelete),
    }));
  };

  const clearDeletedSelection = async (
    digest: string,
    expectedSelection: ImageFile | null
  ): Promise<void> => {
    if (expectedSelection?.digest !== digest || get().selectedImageFile !== expectedSelection) {
      return;
    }
    try {
      await get().selectImageFile(null);
    } catch (error) {
      console.error('Could not clear the deleted photo selection', error);
    }
  };

  return {
    selectedImageFile: null,
    recentImages: [],

    originalImage: null,
    isOriginalImageLoading: false,
    isRecentImagesLoading: false,
    isSampleImageLoading: false,
    hasMoreRecentImages: false,

    loadRecentImages: async (): Promise<void> => {
      set({
        isRecentImagesLoading: true,
      });
      try {
        await replaceRecentImages(RECENT_IMAGES_PAGE_SIZE);
      } finally {
        set({
          isRecentImagesLoading: false,
        });
      }
      const {selectedImageFile} = get();
      if (
        selectedImageFile &&
        !(await hasImageFile(selectedImageFile.digest)) &&
        get().selectedImageFile === selectedImageFile
      ) {
        await get().selectImageFile(null, {setActiveTabKey: false});
      }
    },

    loadMoreRecentImages: async (): Promise<void> => {
      const {hasMoreRecentImages, isRecentImagesLoading} = get();
      if (!hasMoreRecentImages || isRecentImagesLoading) {
        return;
      }
      set({isRecentImagesLoading: true});
      try {
        const baseDigests = get().recentImages.map(({digest}) => digest);
        const {images, hasMore} = await getRecentImages(
          baseDigests.length,
          RECENT_IMAGES_PAGE_SIZE
        );
        set(({recentImages}) => {
          if (!hasDigestSequence(recentImages, baseDigests)) {
            return {};
          }
          const loadedDigests = new Set(baseDigests);
          return {
            recentImages: [
              ...recentImages,
              ...images.filter(({digest}) => !loadedDigests.has(digest)),
            ],
            hasMoreRecentImages: hasMore,
          };
        });
      } finally {
        set({isRecentImagesLoading: false});
      }
    },

    selectLatestImageFile: async (): Promise<void> => {
      for (const image of get().recentImages) {
        const imageFile = toImageFile(image);
        if (!imageFile) {
          continue;
        }
        const selected = await get().selectImageFile(imageFile, {
          setActiveTabKey: false,
          suppressReadError: true,
        });
        if (selected !== 'unreadable') {
          return;
        }
      }
      await get().selectImageFile(null, {setActiveTabKey: false});
    },

    selectRecentImage: async (image: RecentImage): Promise<void> => {
      const imageFile = toImageFile(image);
      if (!imageFile) {
        return;
      }
      const selected = await get().selectImageFile(imageFile, {
        suppressReadError: true,
      });
      if (selected !== 'selected') {
        return;
      }
      const date = new Date();
      await persistChange(get, () => touchImage(image.digest, date));
      const {recentImages, selectedImageFile} = get();
      const currentImage = recentImages.find(({digest}) => digest === image.digest);
      set({
        ...(currentImage
          ? {
              recentImages: [
                {...currentImage, date},
                ...recentImages.filter(({digest}) => digest !== image.digest),
              ],
            }
          : {}),
        ...(selectedImageFile?.digest === image.digest
          ? {selectedImageFile: {...selectedImageFile, date}}
          : {}),
      });
    },

    selectImageFile: async (
      imageFile: ImageFile | null,
      {setActiveTabKey = true, suppressReadError = false} = {}
    ): Promise<SelectImageResult> => {
      const selected = await selectImageOperation.run(
        async (signal): Promise<SelectImageResult> => {
          let originalImage: ImageBitmap | null;
          try {
            originalImage = imageFile
              ? await createImageBitmapAndResize(
                  imageFileToFile(imageFile),
                  ResizeImage.resizeToPixelCount(IMAGE_SIZE['2K'])
                )
              : null;
          } catch (error) {
            signal.throwIfAborted();
            if (isAbortError(error) || !suppressReadError) {
              throw error;
            }
            console.error('Could not read saved photo', error);
            return 'unreadable';
          }
          try {
            signal.throwIfAborted();
            if (setActiveTabKey && imageFile) {
              const activeTabKey = get().colorSet ? TabKey.ColorPicker : TabKey.ColorSet;
              await get().setActiveTabKey(activeTabKey);
              signal.throwIfAborted();
            }
            const prevImage = get().originalImage;
            abortAndClearProcessedImages();
            set({
              selectedImageFile: imageFile,
              originalImage,
              paletteColorMixtures: new Map(),
              selectedPaletteColorMixtures: new Map(),
            });
            prevImage?.close();
          } catch (error) {
            originalImage?.close();
            throw error;
          }
          await get().setTargetColor(null, null);
          signal.throwIfAborted();
          await get().setUnderlayer(null);
          signal.throwIfAborted();
          await get().loadPaletteColorMixtures({signal});
          return 'selected';
        }
      );
      return selected ?? 'aborted';
    },

    saveRecentImageFile: async (imageFile: ImageFile): Promise<void> => {
      imageFile = {...imageFile};
      set({
        isRecentImagesLoading: true,
      });
      try {
        await persistChange(get, () => saveNewImageFiles([imageFile]));
        const {hasMoreRecentImages, recentImages: previousImages} = get();
        const limit = Math.max(previousImages.length, RECENT_IMAGES_PAGE_SIZE);
        const allImages = [
          imageFile,
          ...previousImages.filter(({digest}) => digest !== imageFile.digest),
        ];
        const recentImages = allImages.slice(0, limit);
        set({
          recentImages,
          hasMoreRecentImages: hasMoreRecentImages || allImages.length > limit,
        });
      } finally {
        set({
          isRecentImagesLoading: false,
        });
      }
      await get().selectImageFile(imageFile);
    },

    deleteRecentImage: async (
      digestToDelete: string,
      {scheduleCloudPush = true} = {}
    ): Promise<void> => {
      const selectedImageFileToDelete = get().selectedImageFile;
      set({
        isRecentImagesLoading: true,
      });
      try {
        await persistChange(get, () => deleteImageFileAndColorMixturesByDigest(digestToDelete), {
          schedulePush: scheduleCloudPush,
        });
        removeRecentImage(digestToDelete);
      } finally {
        set({
          isRecentImagesLoading: false,
        });
      }
      await clearDeletedSelection(digestToDelete, selectedImageFileToDelete);
    },

    loadSampleImage: async ({image, name}: SampleImageDefinition): Promise<void> => {
      set({
        isSampleImageLoading: true,
      });
      try {
        const response: Response = await fetch(image, {
          mode: 'cors',
          signal: AbortSignal.timeout(REFERENCE_IMAGE_TIMEOUT_MS),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${image}`);
        }
        const blob: Blob = await response.blob();
        const imageFile: ImageFile = await blobToImageFile(blob, name);
        await get().saveRecentImageFile(imageFile);
      } finally {
        set({
          isSampleImageLoading: false,
        });
      }
    },
  };
};
