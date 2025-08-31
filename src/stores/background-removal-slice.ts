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
import {fillBackgroundWithColor, removeBackground} from '~/src/services/image/background-removal';
import type {OnnxModel} from '~/src/services/ml/types';
import type {AuthSlice} from '~/src/stores/auth-slice';
import {copyOffscreenCanvas, offscreenCanvasToBlob} from '~/src/utils/graphics';

export interface BackgroundRemovalSlice {
  imageFileToRemoveBackground: File | null;
  backgroundRemovalColor: string | null;
  backgroundRemovalModel?: OnnxModel;
  imageWithoutBackgroundCanvas: OffscreenCanvas | null;
  imageWithoutBackgroundBlob: Blob | null;
  isBackgroundRemovalLoading: boolean;
  backgroundRemovalLoadingTip: string | null;

  setImageFileToRemoveBackground: (imageFileToRemoveBackground: File | null) => void;
  setBackgroundRemovalColor: (backgroundRemovalColor: string | null) => void;
  setBackgroundRemovalModel: (backgroundRemovalModel?: OnnxModel) => void;
  removeBackground: () => Promise<void>;
}

export const createBackgroundRemovalSlice: StateCreator<
  BackgroundRemovalSlice & AuthSlice,
  [],
  [],
  BackgroundRemovalSlice
> = (set, get) => ({
  imageFileToRemoveBackground: null,
  backgroundRemovalColor: null,
  imageWithoutBackgroundCanvas: null,
  imageWithoutBackgroundBlob: null,
  isBackgroundRemovalLoading: false,
  backgroundRemovalLoadingTip: null,

  setImageFileToRemoveBackground: (imageFileToRemoveBackground: File | null): void => {
    set({
      imageFileToRemoveBackground,
      imageWithoutBackgroundCanvas: null,
      imageWithoutBackgroundBlob: null,
    });
    void get().removeBackground();
  },
  setBackgroundRemovalColor: (backgroundRemovalColor: string | null): void => {
    set({
      backgroundRemovalColor,
      imageWithoutBackgroundBlob: null,
    });
    void get().removeBackground();
  },
  setBackgroundRemovalModel: (backgroundRemovalModel?: OnnxModel): void => {
    set({
      backgroundRemovalModel,
      imageWithoutBackgroundCanvas: null,
      imageWithoutBackgroundBlob: null,
    });
    void get().removeBackground();
  },
  removeBackground: async (): Promise<void> => {
    const {
      imageFileToRemoveBackground,
      backgroundRemovalColor,
      backgroundRemovalModel,
      imageWithoutBackgroundBlob,
      auth,
    } = get();
    let {imageWithoutBackgroundCanvas} = get();
    if (
      imageWithoutBackgroundBlob ||
      !imageFileToRemoveBackground ||
      !backgroundRemovalModel ||
      !hasAccessTo(auth?.user, backgroundRemovalModel)
    ) {
      return;
    }
    try {
      set({
        isBackgroundRemovalLoading: true,
        backgroundRemovalLoadingTip: null,
      });
      if (!imageWithoutBackgroundCanvas) {
        imageWithoutBackgroundCanvas = await removeBackground(
          imageFileToRemoveBackground,
          backgroundRemovalModel,
          key => {
            set({backgroundRemovalLoadingTip: key});
          }
        );
        set({imageWithoutBackgroundCanvas});
      }
      if (backgroundRemovalColor) {
        imageWithoutBackgroundCanvas = copyOffscreenCanvas(imageWithoutBackgroundCanvas);
        fillBackgroundWithColor(imageWithoutBackgroundCanvas, backgroundRemovalColor);
      }
      const imageWithoutBackgroundBlob: Blob = await offscreenCanvasToBlob(
        imageWithoutBackgroundCanvas,
        {type: 'image/png'}
      );
      set({
        imageWithoutBackgroundBlob,
      });
    } finally {
      set({
        isBackgroundRemovalLoading: false,
        backgroundRemovalLoadingTip: null,
      });
    }
  },
});
