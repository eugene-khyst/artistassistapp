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

import {getTonalValues} from '~/src/services/image/tonal-values';

import type {OriginalImageSlice} from './original-image-slice';

export interface TonalImagesSlice {
  tonalImages: ImageBitmap[];
  isTonalImagesLoading: boolean;

  loadTonalImages: () => void;
}

export const createTonalImagesSlice: StateCreator<
  TonalImagesSlice & OriginalImageSlice,
  [],
  [],
  TonalImagesSlice
> = (set, get) => ({
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
    const newTonalImages = getTonalValues(originalImage);
    set({
      tonalImages: newTonalImages,
      isTonalImagesLoading: false,
    });
  },
});
