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

import type {User} from '~/src/services/auth/types';
import {hasAccessTo} from '~/src/services/auth/utils';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {fileToImageFile} from '~/src/services/image/image-file';
import {transferStyle} from '~/src/services/image/style-transfer';
import type {OnnxModel} from '~/src/services/ml/types';
import type {OriginalImageSlice} from '~/src/stores/original-image-slice';

export interface StyleTransferSlice {
  styleImageFile: File | null;
  styleTransferTrigger: boolean;
  isStyleTransferLoading: boolean;
  styleTransferLoadingTip: string | null;
  styledImageBlob: Blob | null;

  setStyleImageFile: (styleImageFile: File | null) => Promise<void>;
  triggerStyleTransfer: () => void;
  loadStyledImage: (model?: OnnxModel | null, user?: User | null) => Promise<void>;
}

export const createStyleTransferSlice: StateCreator<
  StyleTransferSlice & OriginalImageSlice,
  [],
  [],
  StyleTransferSlice
> = (set, get) => ({
  styleImageFile: null,
  styleTransferTrigger: false,
  isStyleTransferLoading: false,
  styleTransferLoadingTip: null,
  styledImageBlob: null,

  setStyleImageFile: async (styleImageFile: File | null): Promise<void> => {
    if (styleImageFile) {
      set({styleImageFile});
      void saveAppSettings({
        styleTransferImage: await fileToImageFile(styleImageFile),
      });
    }
  },
  triggerStyleTransfer: (): void => {
    if (!get().styleTransferTrigger) {
      set({
        styleTransferTrigger: true,
      });
    }
  },
  loadStyledImage: async (model?: OnnxModel | null, user?: User | null): Promise<void> => {
    const {originalImage, styleImageFile, styleTransferTrigger} = get();
    if (!styleTransferTrigger || !originalImage || !model || !hasAccessTo(user, model)) {
      return;
    }
    const {numInputs = 1} = model;
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
      const styledImageBlob: Blob = await transferStyle(images, model, key => {
        set({styleTransferLoadingTip: key});
      });
      set({styledImageBlob});
    } finally {
      styleImage?.close();
      set({
        isStyleTransferLoading: false,
      });
    }
  },
});
