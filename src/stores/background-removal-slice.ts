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

import {formatFetchProgress} from '@/i18n';
import {hasAccessTo} from '@/services/auth/utils';
import {fillBackgroundWithColor, removeBackground} from '@/services/image/background-removal';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {copyOffscreenCanvas, offscreenCanvasToBlob} from '@/utils/graphics';

export interface BackgroundRemovalSlice {
  imageFileToRemoveBackground: File | null;
  backgroundRemovalColor: string | null;
  backgroundRemovalModel?: OnnxModel;
  imageWithoutBackgroundCanvas: OffscreenCanvas | null;
  imageWithoutBackgroundBlob: Blob | null;
  isBackgroundRemovalLoading: boolean;
  backgroundRemovalDownloadTip: string | null;

  setImageFileToRemoveBackground: (imageFileToRemoveBackground: File | null) => void;
  setBackgroundRemovalColor: (backgroundRemovalColor: string | null) => void;
  setBackgroundRemovalModel: (backgroundRemovalModel: OnnxModel | undefined) => void;
  removeBackground: () => Promise<void>;
  abortBackgroundRemoval: () => void;
}

type BackgroundRemovalSliceDependencies = Pick<AuthSlice, 'auth'>;

export const createBackgroundRemovalSlice: StateCreator<
  BackgroundRemovalSlice & BackgroundRemovalSliceDependencies,
  [],
  [],
  BackgroundRemovalSlice
> = (set, get) => {
  const backgroundRemovalOperation = createAbortableOperation({
    onStart: () => {
      set({
        isBackgroundRemovalLoading: true,
        backgroundRemovalDownloadTip: null,
      });
    },
    onFinish: () => {
      set({
        isBackgroundRemovalLoading: false,
        backgroundRemovalDownloadTip: null,
      });
    },
  });

  return {
    imageFileToRemoveBackground: null,
    backgroundRemovalColor: null,
    imageWithoutBackgroundCanvas: null,
    imageWithoutBackgroundBlob: null,
    isBackgroundRemovalLoading: false,
    backgroundRemovalDownloadTip: null,

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
      if (get().backgroundRemovalModel === backgroundRemovalModel) {
        return;
      }
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
      await backgroundRemovalOperation.run(async signal => {
        if (!imageWithoutBackgroundCanvas) {
          imageWithoutBackgroundCanvas = await removeBackground(
            imageFileToRemoveBackground,
            backgroundRemovalModel,
            auth,
            (key, progress) => {
              signal.throwIfAborted();
              set({
                backgroundRemovalDownloadTip: formatFetchProgress(key, progress),
              });
            },
            signal
          );
          signal.throwIfAborted();
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
        signal.throwIfAborted();
        set({
          imageWithoutBackgroundBlob,
        });
      });
    },

    abortBackgroundRemoval: (): void => {
      backgroundRemovalOperation.abort();
    },
  };
};
