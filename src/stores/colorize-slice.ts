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
import {createColorizedImage} from '@/services/image/colorize';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {createAbortError} from '@/utils/promise';

export interface ColorizeSlice {
  colorizeModel?: OnnxModel;
  colorizeUpscaleModel?: OnnxModel;

  setColorizeModel: (colorizeModel: OnnxModel | undefined) => void;
  setColorizeUpscaleModel: (colorizeUpscaleModel: OnnxModel | undefined) => void;
  colorizeImage: () => Promise<void>;
}

type ColorizeSliceDependencies = Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation'>;

export const createColorizeSlice: StateCreator<
  ColorizeSlice & ColorizeSliceDependencies,
  [],
  [],
  ColorizeSlice
> = (set, get) => ({
  setColorizeModel: (colorizeModel: OnnxModel | undefined): void => {
    if (get().colorizeModel === colorizeModel) {
      return;
    }
    set({
      colorizeModel,
    });
  },

  setColorizeUpscaleModel: (colorizeUpscaleModel: OnnxModel | undefined): void => {
    if (get().colorizeUpscaleModel === colorizeUpscaleModel) {
      return;
    }
    set({
      colorizeUpscaleModel,
    });
  },

  colorizeImage: async (): Promise<void> => {
    const {colorizeModel, colorizeUpscaleModel, auth} = get();
    if (
      !colorizeModel ||
      !colorizeUpscaleModel ||
      !hasAccessTo(auth?.user, [colorizeModel, colorizeUpscaleModel])
    ) {
      return;
    }
    await get().editImageOperation.execute(async ({image, setDownloadTip, signal}) => {
      // A superseding edit can close the store's image while inference still reads it.
      const inputImage = await createImageBitmap(image);
      try {
        signal.throwIfAborted();
        const result = await createColorizedImage({
          image: inputImage,
          colorizeModel,
          upscaleModel: colorizeUpscaleModel,
          auth,
          progressCallback: (key, progress) => {
            setDownloadTip(formatFetchProgress(key, progress));
          },
          signal,
        });
        signal.throwIfAborted();
        if (
          get().colorizeModel !== colorizeModel ||
          get().colorizeUpscaleModel !== colorizeUpscaleModel
        ) {
          throw createAbortError();
        }
        return {
          type: EditImageCommandType.Colorize,
          result,
        };
      } finally {
        inputImage.close();
      }
    });
  },
});
