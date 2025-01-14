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

import {getOutline} from '~/src/services/image/outline';

import type {OriginalImageSlice} from './original-image-slice';

export interface OutlineImageSlice {
  outlineImage: ImageBitmap | null;
  isOutlineImageLoading: boolean;

  loadOutlineImage: () => Promise<void>;
}

export const createOutlineImageSlice: StateCreator<
  OutlineImageSlice & OriginalImageSlice,
  [],
  [],
  OutlineImageSlice
> = (set, get) => ({
  outlineImage: null,
  isOutlineImageLoading: false,

  loadOutlineImage: async (): Promise<void> => {
    const {originalImageFile, outlineImage} = get();
    if (!originalImageFile || outlineImage) {
      return;
    }
    set({
      isOutlineImageLoading: true,
    });
    const newOutlineImage = await getOutline(originalImageFile);
    set({
      outlineImage: newOutlineImage,
      isOutlineImageLoading: false,
    });
  },
});
