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
  countImageFiles,
  deleteImageFileAndColorMixturesByDigest,
  getRecentImageFiles,
  hasImageFile,
  saveNewImageFiles,
  updateImageFile,
} from '@/services/db/image-file-db';
import {blobToImageFile, type ImageFile, imageFileToFile} from '@/services/image/image-file';
import type {SampleImageDefinition} from '@/services/image/sample-images';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import {persistChange} from '@/stores/sync/persist-change';
import {TabKey} from '@/tabs';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {createImageBitmapAndResize, IMAGE_SIZE, ResizeImage} from '@/utils/graphics';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {PaletteSlice} from './palette-slice';
import type {TabSlice} from './tab-slice';

const REFERENCE_IMAGE_TIMEOUT_MS = 120_000;
const RECENT_IMAGE_FILES_PAGE_SIZE = 12;

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
  recentImageFiles: ImageFile[];

  originalImage: ImageBitmap | null;
  isOriginalImageLoading: boolean;
  isRecentImagesLoading: boolean;
  isSampleImageLoading: boolean;
  hasMoreRecentImageFiles: boolean;

  selectImageFile: (
    imageFile: ImageFile | null,
    options?: {setActiveTabKey?: boolean}
  ) => Promise<void>;
  loadRecentImageFiles: () => Promise<void>;
  loadMoreRecentImageFiles: () => Promise<void>;
  selectLatestImageFile: () => Promise<void>;
  saveRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  deleteRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  loadSampleImage: (sampleImage: SampleImageDefinition) => Promise<void>;
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

  const replaceRecentImageFiles = async (limit: number): Promise<void> => {
    const recentImageFiles = await getRecentImageFiles(0, limit);
    const count = await countImageFiles();
    set({
      recentImageFiles,
      hasMoreRecentImageFiles: recentImageFiles.length < count,
    });
  };

  return {
    selectedImageFile: null,
    recentImageFiles: [],

    originalImage: null,
    isOriginalImageLoading: false,
    isRecentImagesLoading: false,
    isSampleImageLoading: false,
    hasMoreRecentImageFiles: false,

    loadRecentImageFiles: async (): Promise<void> => {
      set({
        isRecentImagesLoading: true,
      });
      try {
        await replaceRecentImageFiles(RECENT_IMAGE_FILES_PAGE_SIZE);
      } finally {
        set({
          isRecentImagesLoading: false,
        });
      }
      const {selectedImageFile} = get();
      if (selectedImageFile && !(await hasImageFile(selectedImageFile.digest))) {
        await get().selectImageFile(null, {setActiveTabKey: false});
      }
    },

    loadMoreRecentImageFiles: async (): Promise<void> => {
      const {hasMoreRecentImageFiles, isRecentImagesLoading, recentImageFiles: prev} = get();
      if (!hasMoreRecentImageFiles || isRecentImagesLoading) {
        return;
      }
      const nextImageFiles = await getRecentImageFiles(prev.length, RECENT_IMAGE_FILES_PAGE_SIZE);
      const count = await countImageFiles();
      const recentImageFiles = [...prev, ...nextImageFiles];
      set({
        recentImageFiles,
        hasMoreRecentImageFiles: recentImageFiles.length < count,
      });
    },

    selectLatestImageFile: async (): Promise<void> => {
      const [imageFile = null] = get().recentImageFiles;
      await get().selectImageFile(imageFile, {setActiveTabKey: false});
    },

    selectImageFile: async (
      imageFile: ImageFile | null,
      {setActiveTabKey = true} = {}
    ): Promise<void> => {
      await selectImageOperation.run(async signal => {
        const originalImage = imageFile
          ? await createImageBitmapAndResize(
              imageFileToFile(imageFile),
              ResizeImage.resizeToPixelCount(IMAGE_SIZE['2K'])
            )
          : null;
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
      });
    },

    saveRecentImageFile: async (imageFile: ImageFile): Promise<void> => {
      imageFile = {...imageFile};
      set({
        isRecentImagesLoading: true,
      });
      try {
        await persistChange(get, () =>
          imageFile.id === undefined ? saveNewImageFiles([imageFile]) : updateImageFile(imageFile)
        );
        await replaceRecentImageFiles(
          Math.max(get().recentImageFiles.length, RECENT_IMAGE_FILES_PAGE_SIZE)
        );
      } finally {
        set({
          isRecentImagesLoading: false,
        });
      }
      await get().selectImageFile(imageFile);
    },

    deleteRecentImageFile: async ({digest: digestToDelete}: ImageFile): Promise<void> => {
      set({
        isRecentImagesLoading: true,
      });
      try {
        await persistChange(get, () => deleteImageFileAndColorMixturesByDigest(digestToDelete));
        await replaceRecentImageFiles(
          Math.max(get().recentImageFiles.length, RECENT_IMAGE_FILES_PAGE_SIZE)
        );
      } finally {
        set({
          isRecentImagesLoading: false,
        });
      }
      if (get().selectedImageFile?.digest === digestToDelete) {
        await get().selectImageFile(null);
      }
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
