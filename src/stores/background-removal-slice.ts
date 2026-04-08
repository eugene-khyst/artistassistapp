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

import {hasAccessTo} from '~/src/services/auth/utils';
import {fillBackgroundWithColor, removeBackground} from '~/src/services/image/background-removal';
import type {OnnxModel} from '~/src/services/ml/types';
import type {AuthSlice} from '~/src/stores/auth-slice';
import {formatFetchProgress} from '~/src/utils/fetch';
import {copyOffscreenCanvas, offscreenCanvasToBlob} from '~/src/utils/graphics';
import {isAbortError} from '~/src/utils/promise';

export interface BackgroundRemovalSlice {
  imageFileToRemoveBackground: File | null;
  backgroundRemovalColor: string | null;
  backgroundRemovalModel?: OnnxModel;
  imageWithoutBackgroundCanvas: OffscreenCanvas | null;
  imageWithoutBackgroundBlob: Blob | null;
  isBackgroundRemovalLoading: boolean;
  backgroundRemovalDownloadTip: string | null;
  backgroundRemovalAbortController: AbortController | null;

  setImageFileToRemoveBackground: (imageFileToRemoveBackground: File | null) => void;
  setBackgroundRemovalColor: (backgroundRemovalColor: string | null) => void;
  setBackgroundRemovalModel: (backgroundRemovalModel: OnnxModel | undefined) => void;
  removeBackground: () => Promise<void>;
  abortBackgroundRemoval: () => void;
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
  backgroundRemovalDownloadTip: null,
  backgroundRemovalAbortController: null,

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
  setBackgroundRemovalModel: (backgroundRemovalModel: OnnxModel | undefined): void => {
    set({
      backgroundRemovalModel,
      imageWithoutBackgroundCanvas: null,
      imageWithoutBackgroundBlob: null,
    });
    void get().removeBackground();
  },
  removeBackground: async (): Promise<void> => {
    get().abortBackgroundRemoval();
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
    const backgroundRemovalAbortController = new AbortController();
    set({
      isBackgroundRemovalLoading: true,
      backgroundRemovalDownloadTip: null,
      backgroundRemovalAbortController,
    });
    try {
      if (!imageWithoutBackgroundCanvas) {
        imageWithoutBackgroundCanvas = await removeBackground(
          imageFileToRemoveBackground,
          backgroundRemovalModel,
          (key, progress) => {
            set({
              backgroundRemovalDownloadTip: formatFetchProgress(key, progress),
            });
          },
          backgroundRemovalAbortController.signal
        );
        set({
          imageWithoutBackgroundCanvas,
        });
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
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      if (get().backgroundRemovalAbortController === backgroundRemovalAbortController) {
        set({
          isBackgroundRemovalLoading: false,
          backgroundRemovalDownloadTip: null,
          backgroundRemovalAbortController: null,
        });
      }
    }
  },
  abortBackgroundRemoval: (): void => {
    get().backgroundRemovalAbortController?.abort();
  },
});
