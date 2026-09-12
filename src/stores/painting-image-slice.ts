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

import {formatFetchProgress, formatProcessProgress} from '@/i18n';
import {hasAccessTo} from '@/services/auth/utils';
import {paintImage, PAINTING_PATCH_SIZES, type PaintingPatchSize} from '@/services/image/painting';
import {withProcessedImageCache} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {PROCESSING_PROGRESS_KEY} from '@/utils/fetch';

import {type OriginalImageSlice, registerOriginalImageDependency} from './original-image-slice';

export interface PaintingImageSlice {
  paintingModel: OnnxModel | null;
  paintingPatchSize: PaintingPatchSize;
  paintingImage: ImageBitmap | null;
  isPaintingImageLoading: boolean;
  paintingDownloadTip: string | null;

  setPaintingModel: (model?: OnnxModel | null) => void;
  setPaintingPatchSize: (patchSize: PaintingPatchSize) => void;
  loadPaintingImage: () => Promise<void>;
  abortPainting: () => void;
}

type PaintingImageSliceDependencies = Pick<
  OriginalImageSlice,
  'selectedImageFile' | 'originalImage'
> &
  Pick<AuthSlice, 'auth'>;

export const createPaintingImageSlice: StateCreator<
  PaintingImageSlice & PaintingImageSliceDependencies,
  [],
  [],
  PaintingImageSlice
> = (set, get) => {
  const clearImage = () => {
    const {paintingImage} = get();
    set({
      paintingImage: null,
    });
    paintingImage?.close();
  };
  const paintingOperation = createAbortableOperation({
    onStart: () => {
      clearImage();
      set({
        isPaintingImageLoading: true,
        paintingDownloadTip: null,
      });
    },
    onFinish: () => {
      set({
        isPaintingImageLoading: false,
        paintingDownloadTip: null,
      });
    },
  });

  registerOriginalImageDependency({
    abort: paintingOperation.abort,
    clear: clearImage,
  });

  return {
    paintingModel: null,
    paintingPatchSize: PAINTING_PATCH_SIZES.large,
    paintingImage: null,
    isPaintingImageLoading: false,
    paintingDownloadTip: null,

    setPaintingModel: model => {
      if (model === undefined || get().paintingModel === model) {
        return;
      }
      paintingOperation.abort();
      clearImage();
      set({
        paintingModel: model,
      });
      void get().loadPaintingImage();
    },

    setPaintingPatchSize: patchSize => {
      if (get().paintingPatchSize === patchSize) {
        return;
      }
      paintingOperation.abort();
      clearImage();
      set({
        paintingPatchSize: patchSize,
      });
      void get().loadPaintingImage();
    },

    loadPaintingImage: async () => {
      const {
        selectedImageFile,
        originalImage,
        paintingModel,
        paintingPatchSize,
        paintingImage,
        isPaintingImageLoading,
        auth,
      } = get();
      if (
        paintingImage ||
        isPaintingImageLoading ||
        !selectedImageFile ||
        !originalImage ||
        !paintingModel ||
        !hasAccessTo(auth?.user, paintingModel)
      ) {
        return;
      }
      await paintingOperation.runAndCommit(
        async signal => {
          const cacheModel = {
            ...paintingModel,
            paintingPatchSize,
          };
          return await withProcessedImageCache(cacheModel, [selectedImageFile.digest], () =>
            paintImage(
              originalImage,
              paintingModel,
              auth,
              paintingPatchSize,
              (key, progress) => {
                signal.throwIfAborted();
                set({
                  paintingDownloadTip:
                    key === PROCESSING_PROGRESS_KEY
                      ? formatProcessProgress(progress ?? 0)
                      : formatFetchProgress(key, progress),
                });
              },
              signal
            )
          );
        },
        image => {
          set({
            paintingImage: image,
          });
        },
        image => {
          image.close();
        }
      );
    },

    abortPainting: paintingOperation.abort,
  };
};
