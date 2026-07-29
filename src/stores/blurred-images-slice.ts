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

import {getBlurred} from '@/services/image/blur';
import {createAbortableOperation} from '@/utils/abortable-operation';

import {type OriginalImageSlice, registerProcessedImage} from './original-image-slice';

export interface BlurredImagesSlice {
  blurredImages: ImageBitmap[];
  isBlurredImagesLoading: boolean;

  loadBlurredImages: () => Promise<void>;
  abortBlurredImages: () => void;
}

export const createBlurredImagesSlice: StateCreator<
  BlurredImagesSlice & OriginalImageSlice,
  [],
  [],
  BlurredImagesSlice
> = (set, get) => {
  const blurredImagesOperation = createAbortableOperation({
    onStart: () => {
      set({
        isBlurredImagesLoading: true,
      });
    },
    onFinish: () => {
      set({
        isBlurredImagesLoading: false,
      });
    },
  });

  registerProcessedImage({
    abort: () => {
      blurredImagesOperation.abort();
    },
    clear: () => {
      const {blurredImages} = get();
      set({
        blurredImages: [],
      });
      blurredImages.forEach(image => {
        image.close();
      });
    },
  });

  return {
    blurredImages: [],
    isBlurredImagesLoading: false,

    loadBlurredImages: async (): Promise<void> => {
      const {originalImage, blurredImages} = get();
      if (blurredImages.length || !originalImage) {
        return;
      }
      await blurredImagesOperation.run(async signal => {
        const newBlurredImages = await getBlurred(originalImage);
        if (signal.aborted) {
          newBlurredImages.forEach(image => {
            image.close();
          });
        }
        signal.throwIfAborted();
        set({
          blurredImages: newBlurredImages,
        });
      });
    },

    abortBlurredImages: (): void => {
      blurredImagesOperation.abort();
    },
  };
};
