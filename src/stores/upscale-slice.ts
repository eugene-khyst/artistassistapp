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
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {createUpscaledImage, upscaleFactor} from '@/services/image/upscale';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {PROCESSING_PROGRESS_KEY} from '@/utils/fetch';
import {createAbortError} from '@/utils/promise';

export interface UpscaleSlice {
  upscaleModel?: OnnxModel;

  setUpscaleModel: (upscaleModel: OnnxModel | undefined) => void;
  upscaleImage: () => Promise<void>;
}

type UpscaleSliceDependencies = Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'hasEditedImageAlpha'>;

export const createUpscaleSlice: StateCreator<
  UpscaleSlice & UpscaleSliceDependencies,
  [],
  [],
  UpscaleSlice
> = (set, get) => ({
  setUpscaleModel: (upscaleModel: OnnxModel | undefined): void => {
    if (get().upscaleModel === upscaleModel) {
      return;
    }
    set({
      upscaleModel,
    });
  },

  upscaleImage: async (): Promise<void> => {
    const {upscaleModel, auth, hasEditedImageAlpha} = get();
    if (!upscaleModel || !hasAccessTo(auth?.user, upscaleModel)) {
      return;
    }
    await get().editImageOperation.execute(
      async ({image, setDownloadTip, setProcessTip, signal}) => {
        const factor = upscaleFactor(image);
        if (!factor) {
          return null;
        }
        // A superseding edit can close the store's image while inference still reads it.
        const inputImage = await createImageBitmap(image);
        try {
          signal.throwIfAborted();
          const result = await createUpscaledImage({
            image: inputImage,
            factor,
            transparent: hasEditedImageAlpha(),
            model: upscaleModel,
            auth,
            progressCallback: (key, progress) => {
              if (key === PROCESSING_PROGRESS_KEY) {
                setProcessTip(formatProcessProgress(progress ?? 0));
              } else {
                setDownloadTip(formatFetchProgress(key, progress));
              }
            },
            signal,
          });
          signal.throwIfAborted();
          if (get().upscaleModel !== upscaleModel) {
            throw createAbortError();
          }
          return {
            type: EditImageCommandType.Upscale,
            result,
          };
        } finally {
          inputImage.close();
        }
      }
    );
  },
});
