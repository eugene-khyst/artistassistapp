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

import {getPerspectiveCorrectionImage} from '~/src/services/image/perspective-correction';
import type {Vector} from '~/src/services/math/geometry';
import {
  createImageBitmapResizedTotalPixels,
  rotateImageBitmapClockwise,
} from '~/src/utils/graphics';

export interface PerspectiveCorrectionSlice {
  imageFileToCorrectPerspective: File | null;
  perspectiveUncorrectedImage: ImageBitmap | null;
  perspectiveCorrectedImage: ImageBitmap | null;
  isPerspectiveCorrectedImageLoading: boolean;

  setImageFileToCorrectPerspective: (imageFileToCorrectPerspective: File | null) => Promise<void>;
  correctImagePerspective: (vertices: Vector[]) => void;
  resetPerspectiveCorrection: () => void;
  rotatePerspectiveUncorrectedImage: () => void;
}

export const createPerspectiveCorrectionSlice: StateCreator<
  PerspectiveCorrectionSlice,
  [],
  [],
  PerspectiveCorrectionSlice
> = (set, get) => ({
  imageFileToCorrectPerspective: null,
  perspectiveUncorrectedImage: null,
  perspectiveCorrectedImage: null,
  isPerspectiveCorrectedImageLoading: false,

  setImageFileToCorrectPerspective: async (
    imageFileToCorrectPerspective: File | null
  ): Promise<void> => {
    const {
      perspectiveUncorrectedImage: prevPerspectiveUncorrectedImage,
      perspectiveCorrectedImage: prevPerspectiveCorrectedImage,
    } = get();
    let perspectiveUncorrectedImage: ImageBitmap | null = null;
    if (imageFileToCorrectPerspective) {
      set({
        isPerspectiveCorrectedImageLoading: true,
      });
      perspectiveUncorrectedImage = await createImageBitmapResizedTotalPixels(
        imageFileToCorrectPerspective,
        10e6
      );
    }
    set({
      imageFileToCorrectPerspective,
      perspectiveUncorrectedImage,
      perspectiveCorrectedImage: null,
      isPerspectiveCorrectedImageLoading: false,
    });
    [prevPerspectiveUncorrectedImage, prevPerspectiveCorrectedImage].forEach(prev => prev?.close());
  },
  correctImagePerspective: (vertices: Vector[]): void => {
    const {perspectiveUncorrectedImage, perspectiveCorrectedImage: prev} = get();
    if (!perspectiveUncorrectedImage) {
      return;
    }
    set({
      isPerspectiveCorrectedImageLoading: true,
    });
    const perspectiveCorrectedImage = getPerspectiveCorrectionImage(
      perspectiveUncorrectedImage,
      vertices
    );
    set({
      perspectiveCorrectedImage,
      isPerspectiveCorrectedImageLoading: false,
    });
    prev?.close();
  },
  resetPerspectiveCorrection: (): void => {
    const {perspectiveCorrectedImage: prev} = get();
    set({
      perspectiveCorrectedImage: null,
    });
    prev?.close();
  },
  rotatePerspectiveUncorrectedImage: (): void => {
    const {perspectiveUncorrectedImage, perspectiveCorrectedImage} = get();
    if (!perspectiveUncorrectedImage) {
      return;
    }
    set({
      perspectiveUncorrectedImage: rotateImageBitmapClockwise(perspectiveUncorrectedImage),
      perspectiveCorrectedImage: null,
    });
    [perspectiveUncorrectedImage, perspectiveCorrectedImage].forEach(prev => prev?.close());
  },
});
