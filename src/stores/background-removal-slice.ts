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
import {removeBackground} from '~/src/services/image/background-removal';
import type {OnnxModel} from '~/src/services/ml/types';

export interface BackgroundRemovalSlice {
  imageFileToRemoveBackground: File | null;
  isBackgroundRemovalLoading: boolean;
  backgroundRemovalLoadingTip: string | null;
  imageWithoutBackgroundBlob: Blob | null;

  setImageFileToRemoveBackground: (imageFileToRemoveBackground: File | null) => void;
  loadImageWithoutBackground: (model?: OnnxModel | null, user?: User | null) => Promise<void>;
}

export const createBackgroundRemovalSlice: StateCreator<
  BackgroundRemovalSlice,
  [],
  [],
  BackgroundRemovalSlice
> = (set, get) => ({
  imageFileToRemoveBackground: null,
  isBackgroundRemovalLoading: false,
  backgroundRemovalLoadingTip: null,
  imageWithoutBackgroundBlob: null,

  setImageFileToRemoveBackground: (imageFileToRemoveBackground: File | null): void => {
    set({imageFileToRemoveBackground});
  },
  loadImageWithoutBackground: async (
    model?: OnnxModel | null,
    user?: User | null
  ): Promise<void> => {
    const {imageFileToRemoveBackground} = get();
    if (!imageFileToRemoveBackground || !model || !hasAccessTo(user, model)) {
      return;
    }
    try {
      set({
        isBackgroundRemovalLoading: true,
        backgroundRemovalLoadingTip: null,
        imageWithoutBackgroundBlob: null,
      });
      const imageWithoutBackgroundBlob = await removeBackground(
        imageFileToRemoveBackground,
        model,
        key => {
          set({backgroundRemovalLoadingTip: key});
        }
      );
      set({imageWithoutBackgroundBlob});
    } finally {
      set({
        isBackgroundRemovalLoading: false,
      });
    }
  },
});
