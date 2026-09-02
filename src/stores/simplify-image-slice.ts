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

import {applyFocalPointToSimplifiedImage, simplifyImage} from '@/services/image/simplify-image';
import type {Vector} from '@/services/math/geometry';
import {createAbortableOperation} from '@/utils/abortable-operation';

import {type OriginalImageSlice, registerOriginalImageDependency} from './original-image-slice';

export interface SimplifyImageSlice {
  simplifiedImages: ImageBitmap[];
  simplifyFocalPoint: Vector | null;
  simplifiedMaskedImage: ImageBitmap | null;
  isSimplifiedImagesLoading: boolean;

  loadSimplifiedImages: () => Promise<void>;
  setSimplifyFocalPoint: (simplifyFocalPoint?: Vector) => Promise<void>;
  abortSimplifiedImages: () => void;
}

type SimplifyImageSliceDependencies = Pick<OriginalImageSlice, 'originalImage'>;

export const createSimplifyImageSlice: StateCreator<
  SimplifyImageSlice & SimplifyImageSliceDependencies,
  [],
  [],
  SimplifyImageSlice
> = (set, get) => {
  const simplifyImageOperation = createAbortableOperation({
    onStart: () => {
      set({
        isSimplifiedImagesLoading: true,
      });
    },
    onFinish: () => {
      set({
        isSimplifiedImagesLoading: false,
      });
    },
  });

  registerOriginalImageDependency({
    abort: () => {
      simplifyImageOperation.abort();
    },
    clear: () => {
      const {simplifiedImages, simplifiedMaskedImage} = get();
      set({
        simplifiedImages: [],
        simplifyFocalPoint: null,
        simplifiedMaskedImage: null,
      });
      simplifiedImages.forEach(image => {
        image.close();
      });
      simplifiedMaskedImage?.close();
    },
  });

  return {
    simplifiedImages: [],
    simplifyFocalPoint: null,
    simplifiedMaskedImage: null,
    isSimplifiedImagesLoading: false,

    loadSimplifiedImages: async (): Promise<void> => {
      const {originalImage, simplifiedImages: prev} = get();
      if (!originalImage || prev.length) {
        return;
      }
      await simplifyImageOperation.run(signal => {
        const simplifiedImages = simplifyImage(originalImage);
        const simplifiedMaskedImage = applyFocalPointToSimplifiedImage(simplifiedImages);
        if (signal.aborted) {
          simplifiedImages.forEach(image => {
            image.close();
          });
          simplifiedMaskedImage.close();
        }
        signal.throwIfAborted();
        set({
          simplifiedImages,
          simplifiedMaskedImage,
        });
      });
    },

    setSimplifyFocalPoint: async (simplifyFocalPoint?: Vector): Promise<void> => {
      const {simplifiedImages, simplifiedMaskedImage: prev} = get();
      if (!simplifiedImages.length) {
        return;
      }
      await simplifyImageOperation.run(signal => {
        const simplifiedMaskedImage = applyFocalPointToSimplifiedImage(
          simplifiedImages,
          simplifyFocalPoint
        );
        if (signal.aborted) {
          simplifiedMaskedImage.close();
        }
        signal.throwIfAborted();
        set({
          simplifyFocalPoint,
          simplifiedMaskedImage,
        });
        prev?.close();
      });
    },

    abortSimplifiedImages: (): void => {
      simplifyImageOperation.abort();
    },
  };
};
