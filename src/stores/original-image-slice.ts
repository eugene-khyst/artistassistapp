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
  deleteImageFile,
  getImageFiles,
  getLastImageFile,
  saveImageFile,
} from '@/services/db/image-file-db';
import {blobToImageFile, type ImageFile, imageFileToFile} from '@/services/image/image-file';
import type {SampleImageDefinition} from '@/services/image/sample-images';
import type {ColorMatchImageSlice} from '@/stores/color-match-image-slice';
import {TabKey} from '@/tabs';
import {createImageBitmapAndResize, IMAGE_SIZE, ResizeImage} from '@/utils/graphics';

import type {BlurredImagesSlice} from './blurred-images-slice';
import type {ColorMixerSlice} from './color-mixer-slice';
import type {LimitedPaletteImageSlice} from './limited-palette-image-slice';
import type {OutlineImageSlice} from './outline-image-slice';
import type {PaletteSlice} from './palette-slice';
import type {StyleTransferSlice} from './style-transfer-slice';
import type {TabSlice} from './tab-slice';
import type {TonalImagesSlice} from './tonal-images-slice';

export interface OriginalImageSlice {
  imageFile: ImageFile | null;
  recentImageFiles: ImageFile[];

  originalImage: ImageBitmap | null;
  isOriginalImageLoading: boolean;
  isSampleImageLoading: boolean;

  setImageFile: (imageFile: ImageFile | null, setActiveTabKey?: boolean) => Promise<void>;
  loadRecentImageFiles: () => Promise<void>;
  saveRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  deleteRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  loadSampleImage: (sampleImage: SampleImageDefinition) => Promise<void>;
}

export const createOriginalImageSlice: StateCreator<
  OriginalImageSlice &
    ColorMatchImageSlice &
    TabSlice &
    ColorMixerSlice &
    PaletteSlice &
    TonalImagesSlice &
    BlurredImagesSlice &
    OutlineImageSlice &
    StyleTransferSlice &
    LimitedPaletteImageSlice,
  [],
  [],
  OriginalImageSlice
> = (set, get) => ({
  imageFile: null,
  recentImageFiles: [],

  originalImage: null,
  isOriginalImageLoading: false,
  isSampleImageLoading: false,

  loadRecentImageFiles: async (): Promise<void> => {
    const recentImageFiles: ImageFile[] = await getImageFiles();
    set({
      recentImageFiles,
    });
    const imageFile: ImageFile | undefined = await getLastImageFile();
    if (imageFile) {
      await get().setImageFile(imageFile, false);
    } else {
      await get().loadPaletteColorMixtures();
    }
  },

  setImageFile: async (imageFile: ImageFile | null, setActiveTabKey = true): Promise<void> => {
    const prev: (ImageBitmap | null)[] = [
      get().originalImage,
      get().colorMatchImage,
      get().tonalImages,
      get().blurredImages,
      get().outlineImage,
      get().limitedPaletteImage,
    ].flat();
    if (setActiveTabKey && imageFile) {
      const activeTabKey = get().colorSet ? TabKey.ColorPicker : TabKey.ColorSet;
      await get().setActiveTabKey(activeTabKey);
    }
    set({
      imageFile,
      isOriginalImageLoading: true,
      colorMatchImage: null,
      tonalImages: [],
      blurredImages: [],
      outlineImage: null,
      limitedPaletteImage: null,
      styledImageBlob: null,
      similarColors: [],
    });
    await get().setTargetColor(null, null);
    await get().setUnderlayer(null);
    await get().loadPaletteColorMixtures();
    const originalImage = imageFile
      ? await createImageBitmapAndResize(
          imageFileToFile(imageFile),
          ResizeImage.resizeToPixelCount(IMAGE_SIZE['2K'])
        )
      : null;
    set({
      originalImage,
      isOriginalImageLoading: false,
    });
    prev.forEach(image => {
      image?.close();
    });
  },

  saveRecentImageFile: async (imageFile: ImageFile): Promise<void> => {
    imageFile = {...imageFile};
    await saveImageFile(imageFile);
    set(({recentImageFiles}) => ({
      recentImageFiles: [
        imageFile,
        ...recentImageFiles.filter(({id}: ImageFile) => id !== imageFile.id),
      ],
    }));
    await get().setImageFile(imageFile);
  },

  deleteRecentImageFile: async ({digest: digestToDelete}: ImageFile): Promise<void> => {
    await deleteImageFile(digestToDelete);
    set(({recentImageFiles}) => ({
      recentImageFiles: recentImageFiles.filter(({digest}: ImageFile) => digest !== digestToDelete),
    }));
    if (get().imageFile?.digest === digestToDelete) {
      await get().setImageFile(null);
    }
  },

  loadSampleImage: async ({image, name}: SampleImageDefinition): Promise<void> => {
    set({
      isSampleImageLoading: true,
    });
    try {
      const response: Response = await fetch(image, {mode: 'cors'});
      const blob: Blob = await response.blob();
      const imageFile: ImageFile = await blobToImageFile(blob, name);
      await get().saveRecentImageFile(imageFile);
    } finally {
      set({
        isSampleImageLoading: false,
      });
    }
  },
});
