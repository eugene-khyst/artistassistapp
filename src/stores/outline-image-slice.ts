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

import type {User} from '~/src/services/auth/types';
import {hasAccessTo} from '~/src/services/auth/utils';
import {getOutline} from '~/src/services/image/outline';
import type {OnnxModel} from '~/src/services/ml/types';

import type {OriginalImageSlice} from './original-image-slice';

export interface OutlineImageSlice {
  outlineTrigger: boolean;
  isOutlineImageLoading: boolean;
  outlineLoadingPercent: number | 'auto';
  outlineLoadingTip: string | null;
  outlineImage: ImageBitmap | null;

  triggerOutline: () => void;
  loadOutlineImage: (model?: OnnxModel | null, user?: User | null) => Promise<void>;
}

export const createOutlineImageSlice: StateCreator<
  OutlineImageSlice & OriginalImageSlice,
  [],
  [],
  OutlineImageSlice
> = (set, get) => ({
  outlineTrigger: false,
  isOutlineImageLoading: false,
  outlineLoadingPercent: 'auto',
  outlineLoadingTip: null,
  outlineImage: null,

  triggerOutline: (): void => {
    if (!get().outlineTrigger) {
      set({
        outlineTrigger: true,
      });
    }
  },
  loadOutlineImage: async (model?: OnnxModel | null, user?: User | null): Promise<void> => {
    const {originalImage, outlineTrigger} = get();
    if (!outlineTrigger || !originalImage || (model && !hasAccessTo(user, model))) {
      return;
    }
    try {
      set({
        isOutlineImageLoading: true,
        outlineLoadingPercent: 0,
        outlineLoadingTip: null,
        outlineImage: null,
      });
      const outlineImage = await getOutline(originalImage, model, (key, progress) => {
        set({
          outlineLoadingPercent: progress,
          outlineLoadingTip: key,
        });
      });
      set({outlineImage});
    } finally {
      set({
        isOutlineImageLoading: false,
      });
    }
  },
});
