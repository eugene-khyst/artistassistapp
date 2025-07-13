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

import {hasAccessTo} from '~/src/services/auth/utils';
import {getOutline} from '~/src/services/image/outline';
import type {OnnxModel} from '~/src/services/ml/types';
import type {AuthSlice} from '~/src/stores/auth-slice';

import type {OriginalImageSlice} from './original-image-slice';

export interface OutlineImageSlice {
  outlineModel?: OnnxModel | null;
  isOutlineImageLoading: boolean;
  outlineLoadingTip: string | null;
  outlineImage: ImageBitmap | null;

  setOutlineModel: (outlineModel?: OnnxModel | null) => void;
  loadOutlineImage: () => Promise<void>;
}

export const createOutlineImageSlice: StateCreator<
  OutlineImageSlice & OriginalImageSlice & AuthSlice,
  [],
  [],
  OutlineImageSlice
> = (set, get) => ({
  outlineModel: null,
  isOutlineImageLoading: false,
  outlineLoadingTip: null,
  outlineImage: null,

  setOutlineModel: (outlineModel?: OnnxModel | null): void => {
    set({
      outlineModel,
      outlineImage: null,
    });
    void get().loadOutlineImage();
  },
  loadOutlineImage: async (): Promise<void> => {
    const {originalImage, outlineModel, outlineImage, auth} = get();
    if (
      outlineImage ||
      !originalImage ||
      (outlineModel && !hasAccessTo(auth?.user, outlineModel))
    ) {
      return;
    }
    try {
      set({
        isOutlineImageLoading: true,
        outlineLoadingTip: null,
        outlineImage: null,
      });
      const outlineImage = await getOutline(originalImage, outlineModel, key => {
        set({outlineLoadingTip: key});
      });
      set({outlineImage});
    } finally {
      set({
        isOutlineImageLoading: false,
      });
    }
  },
});
