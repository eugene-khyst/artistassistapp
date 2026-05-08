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

import {ForceLogoutError} from '~/src/services/auth/types';
import {hasAccessTo} from '~/src/services/auth/utils';
import {
  detectDocumentCorners,
  getPerspectiveCorrectionImage,
} from '~/src/services/image/perspective-correction';
import type {Vector} from '~/src/services/math/geometry';
import type {OnnxModel} from '~/src/services/ml/types';
import type {AuthSlice} from '~/src/stores/auth-slice';
import {formatFetchProgress} from '~/src/utils/fetch';
import {
  createImageBitmapAndResize,
  ResizeImage,
  rotateImageBitmapClockwise,
} from '~/src/utils/graphics';

export interface PerspectiveCorrectionSlice {
  imageFileToCorrectPerspective: File | null;
  perspectiveUncorrectedImage: ImageBitmap | null;
  perspectiveCorrectedImage: ImageBitmap | null;
  isPerspectiveCorrectedImageLoading: boolean;

  perspectiveCorrectionModel?: OnnxModel;
  isPerspectiveAutoDetectLoading: boolean;
  perspectiveAutoDetectDownloadTip: string | null;
  perspectiveAutoDetectAbortController: AbortController | null;

  setImageFileToCorrectPerspective: (imageFileToCorrectPerspective: File | null) => Promise<void>;
  correctImagePerspective: (vertices: Vector[]) => void;
  resetPerspectiveCorrection: () => void;
  rotatePerspectiveUncorrectedImage: () => void;
  setPerspectiveCorrectionModel: (perspectiveCorrectionModel: OnnxModel | undefined) => void;
  autoDetectPerspectiveVertices: () => Promise<Vector[] | null>;
  abortPerspectiveAutoDetect: () => void;
}

export const createPerspectiveCorrectionSlice: StateCreator<
  PerspectiveCorrectionSlice & AuthSlice,
  [],
  [],
  PerspectiveCorrectionSlice
> = (set, get) => ({
  imageFileToCorrectPerspective: null,
  perspectiveUncorrectedImage: null,
  perspectiveCorrectedImage: null,
  isPerspectiveCorrectedImageLoading: false,

  isPerspectiveAutoDetectLoading: false,
  perspectiveAutoDetectDownloadTip: null,
  perspectiveAutoDetectAbortController: null,

  setImageFileToCorrectPerspective: async (
    imageFileToCorrectPerspective: File | null
  ): Promise<void> => {
    get().abortPerspectiveAutoDetect();
    const {
      perspectiveUncorrectedImage: prevPerspectiveUncorrectedImage,
      perspectiveCorrectedImage: prevPerspectiveCorrectedImage,
    } = get();
    let perspectiveUncorrectedImage: ImageBitmap | null = null;
    if (imageFileToCorrectPerspective) {
      set({
        isPerspectiveCorrectedImageLoading: true,
      });
      perspectiveUncorrectedImage = await createImageBitmapAndResize(
        imageFileToCorrectPerspective,
        ResizeImage.resizeToPixelCount(10e6)
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
    get().abortPerspectiveAutoDetect();
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
  setPerspectiveCorrectionModel: (perspectiveCorrectionModel: OnnxModel | undefined): void => {
    set({
      perspectiveCorrectionModel,
    });
  },
  autoDetectPerspectiveVertices: async (): Promise<Vector[] | null> => {
    get().abortPerspectiveAutoDetect();
    const {perspectiveUncorrectedImage, perspectiveCorrectionModel, auth} = get();
    if (
      !perspectiveUncorrectedImage ||
      !perspectiveCorrectionModel ||
      !hasAccessTo(auth?.user, perspectiveCorrectionModel)
    ) {
      return null;
    }
    const perspectiveAutoDetectAbortController = new AbortController();
    set({
      isPerspectiveAutoDetectLoading: true,
      perspectiveAutoDetectDownloadTip: null,
      perspectiveAutoDetectAbortController,
    });
    try {
      return await detectDocumentCorners(
        perspectiveUncorrectedImage,
        perspectiveCorrectionModel,
        auth,
        (key, progress) => {
          set({
            perspectiveAutoDetectDownloadTip: formatFetchProgress(key, progress),
          });
        },
        perspectiveAutoDetectAbortController.signal
      );
    } catch (error) {
      if (error instanceof ForceLogoutError) {
        void get().logout(error.reason);
        return null;
      }
      // Propagate AbortError so the UI can skip the error toast on cancel.
      throw error;
    } finally {
      if (get().perspectiveAutoDetectAbortController === perspectiveAutoDetectAbortController) {
        set({
          isPerspectiveAutoDetectLoading: false,
          perspectiveAutoDetectDownloadTip: null,
          perspectiveAutoDetectAbortController: null,
        });
      }
    }
  },
  abortPerspectiveAutoDetect: (): void => {
    get().perspectiveAutoDetectAbortController?.abort();
  },
});
