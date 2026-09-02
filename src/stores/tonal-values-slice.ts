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

import {extractTonalValues} from '@/services/image/tonal-values';

import {type OriginalImageSlice, registerOriginalImageDependency} from './original-image-slice';

export interface TonalValuesSlice {
  tonalImages: ImageBitmap[];
  isTonalImagesLoading: boolean;

  loadTonalImages: () => void;
}

type TonalValuesSliceDependencies = Pick<OriginalImageSlice, 'originalImage'>;

export const createTonalValuesSlice: StateCreator<
  TonalValuesSlice & TonalValuesSliceDependencies,
  [],
  [],
  TonalValuesSlice
> = (set, get) => {
  registerOriginalImageDependency({
    clear: () => {
      const {tonalImages} = get();
      set({
        tonalImages: [],
      });
      tonalImages.forEach(image => {
        image.close();
      });
    },
  });

  return {
    tonalImages: [],
    isTonalImagesLoading: false,

    loadTonalImages: (): void => {
      const {originalImage, tonalImages} = get();
      if (tonalImages.length || !originalImage) {
        return;
      }
      set({
        isTonalImagesLoading: true,
      });
      const newTonalImages = extractTonalValues(originalImage);
      set({
        tonalImages: newTonalImages,
        isTonalImagesLoading: false,
      });
    },
  };
};
