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

import {getBlurred, getBlurredMasked} from '@/services/image/blur';
import type {Vector} from '@/services/math/geometry';
import {createAbortableOperation} from '@/utils/abortable-operation';

import {type OriginalImageSlice, registerProcessedImage} from './original-image-slice';

export interface BlurredImagesSlice {
  blurredImages: ImageBitmap[];
  blurFocalPoint: Vector | null;
  blurredMaskedImage: ImageBitmap | null;
  isBlurredImagesLoading: boolean;

  loadBlurredImages: () => Promise<void>;
  setBlurFocalPoint: (blurFocalPoint?: Vector) => Promise<void>;
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
      const {blurredImages, blurredMaskedImage} = get();
      set({
        blurredImages: [],
        blurFocalPoint: null,
        blurredMaskedImage: null,
      });
      blurredImages.forEach(image => {
        image.close();
      });
      blurredMaskedImage?.close();
    },
  });

  return {
    blurredImages: [],
    blurFocalPoint: null,
    blurredMaskedImage: null,
    isBlurredImagesLoading: false,

    loadBlurredImages: async (): Promise<void> => {
      const {originalImage, blurredImages: prev} = get();
      if (!originalImage || prev.length) {
        return;
      }
      await blurredImagesOperation.run(async signal => {
        const blurredImages = await getBlurred(originalImage);
        const blurredMaskedImage = getBlurredMasked(blurredImages);
        if (signal.aborted) {
          blurredImages.forEach(image => {
            image.close();
          });
          blurredMaskedImage.close();
        }
        signal.throwIfAborted();
        set({
          blurredImages,
          blurredMaskedImage,
        });
      });
    },

    setBlurFocalPoint: async (blurFocalPoint?: Vector): Promise<void> => {
      const {blurredImages, blurredMaskedImage: prev} = get();
      if (!blurredImages.length) {
        return;
      }
      await blurredImagesOperation.run(signal => {
        const blurredMaskedImage = getBlurredMasked(blurredImages, blurFocalPoint);
        if (signal.aborted) {
          blurredMaskedImage.close();
        }
        signal.throwIfAborted();
        set({
          blurFocalPoint,
          blurredMaskedImage,
        });
        prev?.close();
      });
    },

    abortBlurredImages: (): void => {
      blurredImagesOperation.abort();
    },
  };
};
