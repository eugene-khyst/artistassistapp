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

import {hasAccessTo} from '~/src/services/auth/utils';
import {getOutline} from '~/src/services/image/outline';
import type {OnnxModel} from '~/src/services/ml/types';
import type {AuthSlice} from '~/src/stores/auth-slice';
import {formatFetchProgress} from '~/src/utils/fetch';
import {isAbortError} from '~/src/utils/promise';

import type {OriginalImageSlice} from './original-image-slice';

export interface OutlineImageSlice {
  outlineModel?: OnnxModel | null;
  isOutlineImageLoading: boolean;
  outlineDownloadTip: string | null;
  outlineAbortController: AbortController | null;
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
> = (set, get) => ({
  isOutlineImageLoading: false,
  outlineDownloadTip: null,
  outlineAbortController: null,
  outlineImage: null,

  setOutlineModel: (outlineModel?: OnnxModel | null): void => {
    set({
      outlineModel,
      outlineImage: null,
    });
    void get().loadOutlineImage();
  },
  loadOutlineImage: async (): Promise<void> => {
    get().abortOutline();
    const {originalImage, outlineModel, outlineImage, auth} = get();
    if (outlineImage || !originalImage || !outlineModel || !hasAccessTo(auth?.user, outlineModel)) {
      return;
    }
    const outlineAbortController = new AbortController();
    set({
      outlineImage: null,
      isOutlineImageLoading: true,
      outlineDownloadTip: null,
      outlineAbortController,
    });
    try {
      const outlineImage = await getOutline(
        originalImage,
        outlineModel,
        (key, progress) => {
          set({outlineDownloadTip: formatFetchProgress(key, progress)});
        },
        outlineAbortController.signal
      );
      set({
        outlineImage,
      });
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      if (get().outlineAbortController === outlineAbortController) {
        set({
          isOutlineImageLoading: false,
          outlineDownloadTip: null,
          outlineAbortController: null,
        });
      }
    }
  },
  abortOutline: (): void => {
    get().outlineAbortController?.abort();
  },
});
