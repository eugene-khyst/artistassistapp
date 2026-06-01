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

import {hasAccessTo} from '@/services/auth/utils';
import {fileToImageFile} from '@/services/image/image-file';
import {transferStyle} from '@/services/image/style-transfer';
import type {OnnxModel} from '@/services/ml/types';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {OriginalImageSlice} from '@/stores/original-image-slice';
import {formatFetchProgress} from '@/utils/fetch';
import {imageBitmapToBlob} from '@/utils/graphics';
import {isAbortError} from '@/utils/promise';

export interface StyleTransferSlice {
  styleTransferModel?: OnnxModel;
  styleImageFile?: File;
  isStyleTransferLoading: boolean;
  styleTransferDownloadTip: string | null;
  styleTransferAbortController: AbortController | null;
  styledImageBlob: Blob | null;

  setStyleTransferModel: (styleTransferModel?: OnnxModel) => void;
  setStyleImageFile: (styleImageFile?: File) => Promise<void>;
  loadStyledImage: () => Promise<void>;
  abortStyleTransfer: () => void;
}

export const createStyleTransferSlice: StateCreator<
  StyleTransferSlice & AppSlice & OriginalImageSlice & AuthSlice,
  [],
  [],
  StyleTransferSlice
> = (set, get) => ({
  isStyleTransferLoading: false,
  styleTransferDownloadTip: null,
  styleTransferAbortController: null,
  styledImageBlob: null,

  setStyleTransferModel: (styleTransferModel?: OnnxModel): void => {
    if (get().styleTransferModel === styleTransferModel) {
      return;
    }
    set({
      styleTransferModel,
      styledImageBlob: null,
    });
    void get().loadStyledImage();
  },

  setStyleImageFile: async (styleImageFile?: File): Promise<void> => {
    if (styleImageFile) {
      set({
        styleImageFile,
        styledImageBlob: null,
      });
      await get().saveAppSettings({
        styleTransferImage: await fileToImageFile(styleImageFile),
      });
      void get().loadStyledImage();
    }
  },

  loadStyledImage: async (): Promise<void> => {
    get().abortStyleTransfer();
    const {originalImage, styleImageFile, styleTransferModel, styledImageBlob, auth} = get();
    if (
      styledImageBlob ||
      !originalImage ||
      !styleTransferModel ||
      !hasAccessTo(auth?.user, styleTransferModel)
    ) {
      return;
    }
    const {numInputs = 1} = styleTransferModel;
    if (numInputs > 1 && !styleImageFile) {
      return;
    }
    const styleImage: ImageBitmap | null =
      numInputs > 1 && styleImageFile ? await createImageBitmap(styleImageFile) : null;
    const styleTransferAbortController = new AbortController();
    set({
      styledImageBlob: null,
      isStyleTransferLoading: true,
      styleTransferDownloadTip: null,
      styleTransferAbortController,
    });
    try {
      const images = styleImage ? [originalImage, styleImage] : [originalImage];
      const styledImage: ImageBitmap = await transferStyle(
        images,
        styleTransferModel,
        auth,
        (key, progress) => {
          set({
            styleTransferDownloadTip: formatFetchProgress(key, progress),
          });
        },
        styleTransferAbortController.signal
      );
      const styledImageBlob: Blob = await imageBitmapToBlob(styledImage);
      set({
        styledImageBlob,
      });
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    } finally {
      styleImage?.close();
      if (get().styleTransferAbortController === styleTransferAbortController) {
        set({
          isStyleTransferLoading: false,
          styleTransferDownloadTip: null,
          styleTransferAbortController: null,
        });
      }
    }
  },

  abortStyleTransfer: (): void => {
    get().styleTransferAbortController?.abort();
  },
});
