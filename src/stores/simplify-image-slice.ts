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

import {Vector} from '@eugene-khyst/artistassistapp-image-processing/math/geometry';
import {
  applyFocalPointToSimplifiedImage,
  simplifyImage,
} from '@eugene-khyst/artistassistapp-image-processing/simplify-image';
import type {StateCreator} from 'zustand';

import {createAbortableOperation} from '@/utils/abortable-operation';

import {type OriginalImageSlice, registerOriginalImageDependency} from './original-image-slice';

export interface SimplifyImageSlice {
  simplifiedImages: ImageBitmap[];
  simplifyFocalPoint: Vector | null;
  simplifiedMaskedImage: ImageBitmap | null;
  isSimplifiedImagesLoading: boolean;

  loadSimplifiedImages: () => Promise<void>;
  setSimplifyFocalPoint: (simplifyFocalPoint: Vector | null) => Promise<void>;
  abortSimplifiedImages: () => void;
}

type SimplifyImageSliceDependencies = Pick<
  OriginalImageSlice,
  'originalImage' | 'selectedImageFile' | 'saveImageFocalPoint'
>;

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

  const toSimplifyFocalPoint = ({width, height}: ImageBitmap): Vector | null => {
    const focalPoint = get().selectedImageFile?.focalPoint;
    return focalPoint ? new Vector(focalPoint.x * width, focalPoint.y * height) : null;
  };

  const applyFocalPoint = async (simplifyFocalPoint: Vector | null): Promise<boolean> => {
    const {simplifiedImages, simplifiedMaskedImage: prev} = get();
    if (!simplifiedImages.length) {
      return false;
    }
    const isApplied = await simplifyImageOperation.run(signal => {
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
      return true;
    });
    return !!isApplied;
  };

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
    onMetadataChange: () => {
      const [simplifiedImage] = get().simplifiedImages;
      if (simplifiedImage) {
        void applyFocalPoint(toSimplifyFocalPoint(simplifiedImage));
      }
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
        const simplifyFocalPoint = toSimplifyFocalPoint(simplifiedImages[0]!);
        const simplifiedMaskedImage = applyFocalPointToSimplifiedImage(
          simplifiedImages,
          simplifyFocalPoint
        );
        if (signal.aborted) {
          simplifiedImages.forEach(image => {
            image.close();
          });
          simplifiedMaskedImage.close();
        }
        signal.throwIfAborted();
        set({
          simplifiedImages,
          simplifyFocalPoint,
          simplifiedMaskedImage,
        });
      });
    },

    setSimplifyFocalPoint: async (simplifyFocalPoint: Vector | null): Promise<void> => {
      const {
        selectedImageFile,
        simplifiedImages: [simplifiedImage],
      } = get();
      if (!selectedImageFile || !simplifiedImage || !(await applyFocalPoint(simplifyFocalPoint))) {
        return;
      }
      const {width, height} = simplifiedImage;
      await get().saveImageFocalPoint(
        selectedImageFile.digest,
        simplifyFocalPoint && {x: simplifyFocalPoint.x / width, y: simplifyFocalPoint.y / height}
      );
    },

    abortSimplifiedImages: (): void => {
      simplifyImageOperation.abort();
    },
  };
};
