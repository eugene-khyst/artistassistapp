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

import {PAPER_WHITE_HEX} from '~/src/services/color/color-mixer';
import {
  deleteImageFile,
  getImageFiles,
  getLastImageFile,
  saveImageFile,
} from '~/src/services/db/image-file-db';
import {blobToImageFile, type ImageFile, imageFileToFile} from '~/src/services/image/image-file';
import type {SampleImageDefinition} from '~/src/services/image/sample-images';
import type {ColorMatchImageSlice} from '~/src/stores/color-match-image-slice';
import {TabKey} from '~/src/tabs';
import {createImageBitmapAndResize, IMAGE_SIZE, ResizeImage} from '~/src/utils/graphics';

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

  originalImageFile: File | null;
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

  originalImageFile: null,
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
    const originalImageFile: File | null = imageFile ? imageFileToFile(imageFile) : null;
    set({
      imageFile,
      originalImageFile,
      isOriginalImageLoading: true,
      colorMatchImage: null,
      tonalImages: [],
      blurredImages: [],
      outlineImage: null,
      limitedPaletteImage: null,
      styledImageBlob: null,
      backgroundColor: PAPER_WHITE_HEX,
      targetColor: PAPER_WHITE_HEX,
      similarColors: [],
    });
    await get().loadPaletteColorMixtures();
    const originalImage = originalImageFile
      ? await createImageBitmapAndResize(
          originalImageFile,
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
  deleteRecentImageFile: async ({id: idToDelete}: ImageFile): Promise<void> => {
    if (idToDelete) {
      await deleteImageFile(idToDelete);
      set(({recentImageFiles}) => ({
        recentImageFiles: recentImageFiles.filter(({id}: ImageFile) => id !== idToDelete),
      }));
      if (get().imageFile?.id === idToDelete) {
        await get().setImageFile(null);
      }
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
