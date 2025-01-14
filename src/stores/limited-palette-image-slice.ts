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

import type {Remote} from 'comlink';
import {wrap} from 'comlink';
import type {StateCreator} from 'zustand';

import type {ColorSet} from '~/src/services/color/types';
import type {LimitedPalette} from '~/src/services/image/limited-palette';

import type {OriginalImageSlice} from './original-image-slice';

const limitedPalette: Remote<LimitedPalette> = wrap(
  new Worker(new URL('../services/image/worker/limited-palette-worker.ts', import.meta.url), {
    type: 'module',
  })
);

export interface LimitedPaletteImageSlice {
  limitedPaletteImage: ImageBitmap | null;
  isLimitedPaletteImageLoading: boolean;

  setLimitedColorSet: (limitedColorSet: ColorSet) => Promise<void>;
}

export const createLimitedPaletteImageSlice: StateCreator<
  LimitedPaletteImageSlice & OriginalImageSlice,
  [],
  [],
  LimitedPaletteImageSlice
> = (set, get) => ({
  limitedPaletteImage: null,
  isLimitedPaletteImageLoading: false,

  setLimitedColorSet: async (limitedColorSet: ColorSet): Promise<void> => {
    const {originalImageFile} = get();
    if (!originalImageFile) {
      return;
    }
    set({isLimitedPaletteImageLoading: true});
    const {preview: limitedPaletteImage} = await limitedPalette.getPreview(
      originalImageFile,
      limitedColorSet
    );
    set({
      limitedPaletteImage,
      isLimitedPaletteImageLoading: false,
    });
  },
});
