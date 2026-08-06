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
import {getStyleImage, saveStyleImage} from '@/services/db/style-image-db';
import {type ImageFile, imageFileToFile} from '@/services/image/image-file';
import {transferStyle} from '@/services/image/style-transfer';
import {withProcessedImageBlobCache} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import {type OriginalImageSlice, registerProcessedImage} from '@/stores/original-image-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';

export interface StyleTransferSlice {
  styleTransferModel?: OnnxModel;
  styleTransferImage: ImageFile | null;
  isStyleTransferLoading: boolean;
  styleTransferDownloadTip: string | null;
  styledImageBlob: Blob | null;

  setStyleTransferModel: (styleTransferModel?: OnnxModel) => void;
  setStyleImageFile: (styleImageFile?: ImageFile) => Promise<void>;
  loadStyleImage: () => Promise<ImageFile | null>;
  refreshStyledImage: () => Promise<void>;
  loadStyledImage: () => Promise<void>;
  abortStyleTransfer: () => void;
}

export const createStyleTransferSlice: StateCreator<
  StyleTransferSlice & AppSlice & OriginalImageSlice & AuthSlice,
  [],
  [],
  StyleTransferSlice
> = (set, get) => {
  const styleTransferOperation = createAbortableOperation({
    onStart: () => {
      set({
        styledImageBlob: null,
        isStyleTransferLoading: true,
        styleTransferDownloadTip: null,
      });
    },
    onFinish: () => {
      set({
        isStyleTransferLoading: false,
        styleTransferDownloadTip: null,
      });
    },
  });

  registerProcessedImage({
    abort: () => {
      styleTransferOperation.abort();
    },
    clear: () => {
      set({styledImageBlob: null});
    },
  });

  return {
    styleTransferImage: null,
    isStyleTransferLoading: false,
    styleTransferDownloadTip: null,
    styledImageBlob: null,

    setStyleTransferModel: (styleTransferModel?: OnnxModel): void => {
      if (get().styleTransferModel === styleTransferModel) {
        return;
      }
      get().abortStyleTransfer();
      set({
        styleTransferModel,
        styledImageBlob: null,
      });
      void get().loadStyledImage();
    },

    setStyleImageFile: async (styleImageFile?: ImageFile): Promise<void> => {
      if (!styleImageFile) {
        return;
      }
      get().abortStyleTransfer();
      await saveStyleImage(styleImageFile);
      await get().saveAppSettings({styleTransferImageDigest: styleImageFile.digest});
      set({
        styleTransferImage: styleImageFile,
        styledImageBlob: null,
      });
      void get().loadStyledImage();
    },

    loadStyleImage: async (): Promise<ImageFile | null> => {
      const {styleTransferImage} = get();
      if (styleTransferImage) {
        return styleTransferImage;
      }
      const storedStyleImage = (await getStyleImage()) ?? null;
      set({
        styleTransferImage: storedStyleImage,
      });
      return storedStyleImage;
    },

    refreshStyledImage: async (): Promise<void> => {
      get().abortStyleTransfer();
      set({
        styledImageBlob: null,
        styleTransferImage: null,
      });
      await get().loadStyledImage();
    },

    loadStyledImage: async (): Promise<void> => {
      const {
        selectedImageFile,
        originalImage,
        styleTransferModel,
        styledImageBlob,
        isStyleTransferLoading,
        auth,
      } = get();
      if (
        styledImageBlob ||
        isStyleTransferLoading ||
        !selectedImageFile ||
        !originalImage ||
        !styleTransferModel ||
        !hasAccessTo(auth?.user, styleTransferModel)
      ) {
        return;
      }
      const {numInputs = 1} = styleTransferModel;
      const styleTransferImage = numInputs > 1 ? await get().loadStyleImage() : null;
      if (numInputs > 1 && !styleTransferImage) {
        return;
      }
      await styleTransferOperation.run(async signal => {
        const digests = [
          selectedImageFile.digest,
          ...(styleTransferImage ? [styleTransferImage.digest] : []),
        ];
        const styledImageBlob: Blob = await withProcessedImageBlobCache(
          styleTransferModel,
          digests,
          async () => {
            const styleImage: ImageBitmap | null = styleTransferImage
              ? await createImageBitmap(imageFileToFile(styleTransferImage))
              : null;
            try {
              return await transferStyle(
                styleImage ? [originalImage, styleImage] : [originalImage],
                styleTransferModel,
                auth,
                (key, progress) => {
                  signal.throwIfAborted();
                  set({
                    styleTransferDownloadTip: formatFetchProgress(key, progress),
                  });
                },
                signal
              );
            } finally {
              styleImage?.close();
            }
          }
        );
        signal.throwIfAborted();
        set({
          styledImageBlob,
        });
      });
    },

    abortStyleTransfer: (): void => {
      styleTransferOperation.abort();
    },
  };
};
