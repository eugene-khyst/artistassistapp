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
import {getOutline} from '@/services/image/outline';
import {withProcessedImageCache} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';

import {type OriginalImageSlice, registerProcessedImage} from './original-image-slice';

export interface OutlineImageSlice {
  outlineModel?: OnnxModel | null;
  isOutlineImageLoading: boolean;
  outlineDownloadTip: string | null;
  outlineImage: ImageBitmap | null;

  setOutlineModel: (outlineModel?: OnnxModel | null) => void;
  loadOutlineImage: () => Promise<void>;
  abortOutline: () => void;
}

export const createOutlineImageSlice: StateCreator<
  OutlineImageSlice & OriginalImageSlice & AuthSlice,
  [],
  [],
  OutlineImageSlice
> = (set, get) => {
  const outlineOperation = createAbortableOperation({
    onStart: () => {
      set({
        outlineImage: null,
        isOutlineImageLoading: true,
        outlineDownloadTip: null,
      });
    },
    onFinish: () => {
      set({
        isOutlineImageLoading: false,
        outlineDownloadTip: null,
      });
    },
  });

  registerProcessedImage({
    abort: () => {
      outlineOperation.abort();
    },
    clear: () => {
      const {outlineImage} = get();
      set({outlineImage: null});
      outlineImage?.close();
    },
  });

  return {
    isOutlineImageLoading: false,
    outlineDownloadTip: null,
    outlineImage: null,

    setOutlineModel: (outlineModel?: OnnxModel | null): void => {
      if (get().outlineModel === outlineModel) {
        return;
      }
      get().abortOutline();
      const {outlineImage: prev} = get();
      set({
        outlineModel,
        outlineImage: null,
      });
      prev?.close();
      void get().loadOutlineImage();
    },

    loadOutlineImage: async (): Promise<void> => {
      const {
        selectedImageFile,
        originalImage,
        outlineModel,
        outlineImage,
        isOutlineImageLoading,
        auth,
      } = get();
      if (
        outlineImage ||
        isOutlineImageLoading ||
        !selectedImageFile ||
        !originalImage ||
        !outlineModel ||
        !hasAccessTo(auth?.user, outlineModel)
      ) {
        return;
      }
      await outlineOperation.run(async signal => {
        const outlineImage = await withProcessedImageCache(
          outlineModel,
          [selectedImageFile.digest],
          () =>
            getOutline(
              originalImage,
              outlineModel,
              auth,
              (key, progress) => {
                signal.throwIfAborted();
                set({
                  outlineDownloadTip: formatFetchProgress(key, progress),
                });
              },
              signal
            ),
          {type: 'image/png'}
        );
        if (signal.aborted) {
          outlineImage.close();
        }
        signal.throwIfAborted();
        set({
          outlineImage,
        });
      });
    },

    abortOutline: (): void => {
      outlineOperation.abort();
    },
  };
};
