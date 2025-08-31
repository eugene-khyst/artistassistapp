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

import {hasAccessTo} from '~/src/services/auth/utils';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {fileToImageFile} from '~/src/services/image/image-file';
import {transferStyle} from '~/src/services/image/style-transfer';
import type {OnnxModel} from '~/src/services/ml/types';
import type {AuthSlice} from '~/src/stores/auth-slice';
import type {OriginalImageSlice} from '~/src/stores/original-image-slice';
import {offscreenCanvasToBlob} from '~/src/utils/graphics';

export interface StyleTransferSlice {
  styleTransferModel?: OnnxModel;
  styleImageFile?: File;
  isStyleTransferLoading: boolean;
  styleTransferLoadingTip: string | null;
  styledImageBlob: Blob | null;

  setStyleTransferModel: (styleTransferModel?: OnnxModel) => void;
  setStyleImageFile: (styleImageFile?: File) => Promise<void>;
  loadStyledImage: () => Promise<void>;
}

export const createStyleTransferSlice: StateCreator<
  StyleTransferSlice & OriginalImageSlice & AuthSlice,
  [],
  [],
  StyleTransferSlice
> = (set, get) => ({
  isStyleTransferLoading: false,
  styleTransferLoadingTip: null,
  styledImageBlob: null,

  setStyleTransferModel: (styleTransferModel?: OnnxModel): void => {
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
      void saveAppSettings({
        styleTransferImage: await fileToImageFile(styleImageFile),
      });
      void get().loadStyledImage();
    }
  },
  loadStyledImage: async (): Promise<void> => {
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
    try {
      set({
        isStyleTransferLoading: true,
        styleTransferLoadingTip: null,
        styledImageBlob: null,
      });
      const images = styleImage ? [originalImage, styleImage] : [originalImage];
      const styledImageCanvas: OffscreenCanvas = await transferStyle(
        images,
        styleTransferModel,
        key => {
          set({styleTransferLoadingTip: key});
        }
      );
      const styledImageBlob: Blob = await offscreenCanvasToBlob(styledImageCanvas);
      set({styledImageBlob});
    } finally {
      styleImage?.close();
      set({
        isStyleTransferLoading: false,
      });
    }
  },
});
