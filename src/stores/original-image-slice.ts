/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
import {getColorMixtures} from '~/src/services/db/color-mixture-db';
import {deleteImageFile, saveImageFile} from '~/src/services/db/image-file-db';
import {type ImageFile, imageFileToFile} from '~/src/services/image/image-file';
import {TabKey} from '~/src/tabs';
import {createImageBitmapResizedTotalPixels, IMAGE_SIZE} from '~/src/utils/graphics';

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

  setImageFile: (imageFile: ImageFile | null, setActiveTabKey?: boolean) => Promise<void>;
  saveRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  deleteRecentImageFile: (imageFile: ImageFile) => Promise<void>;
}

export const createOriginalImageSlice: StateCreator<
  OriginalImageSlice &
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

  setImageFile: async (imageFile: ImageFile | null, setActiveTabKey = true): Promise<void> => {
    const prev: (ImageBitmap | null)[] = [
      get().originalImage,
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
      tonalImages: [],
      blurredImages: [],
      outlineImage: null,
      limitedPaletteImage: null,
      imageFileToStyle: null,
      backgroundColor: PAPER_WHITE_HEX,
      targetColor: PAPER_WHITE_HEX,
      similarColors: [],
      paletteColorMixtures: await getColorMixtures(imageFile?.id),
    });
    const originalImage: ImageBitmap | null = originalImageFile
      ? await createImageBitmapResizedTotalPixels(originalImageFile, IMAGE_SIZE['2K'])
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
    await saveImageFile(imageFile);
    set(state => ({
      recentImageFiles: [
        imageFile,
        ...state.recentImageFiles.filter(({id}: ImageFile) => id !== imageFile.id),
      ],
    }));
    await get().setImageFile(imageFile);
  },
  deleteRecentImageFile: async ({id: idToDelete}: ImageFile): Promise<void> => {
    if (idToDelete) {
      await deleteImageFile(idToDelete);
      set(state => ({
        recentImageFiles: state.recentImageFiles.filter(({id}: ImageFile) => id !== idToDelete),
      }));
      if (get().imageFile?.id === idToDelete) {
        await get().setImageFile(null);
      }
    }
  },
});
