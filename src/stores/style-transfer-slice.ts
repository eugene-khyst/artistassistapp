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
import {
  discardStyleImage as discardStoredStyleImage,
  getStyleImage,
  saveStyleImage,
} from '@/services/db/style-image-db';
import {ImageUnreadableError} from '@/services/image/errors';
import {type ImageFile, imageFileToFile, materializeImageFile} from '@/services/image/image-file';
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

  const discardStyleImage = async (expectedDigest: string): Promise<void> => {
    const {appSettings, discarded} = await discardStoredStyleImage(expectedDigest);
    if (!discarded) {
      return;
    }
    styleTransferOperation.abort();
    set({
      appSettings,
      styleTransferImage: null,
      styledImageBlob: null,
    });
  };

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
      const appSettings = await saveStyleImage(styleImageFile);
      // A transfer started during the save used the previous style image.
      get().abortStyleTransfer();
      set({
        appSettings,
        styleTransferImage: styleImageFile,
        styledImageBlob: null,
      });
      void get().loadStyledImage();
    },

    loadStyleImage: async (): Promise<ImageFile | null> => {
      const {styleTransferImage, appSettings} = get();
      const storedStyleImageDigest = appSettings.styleTransferImageDigest;
      if (!storedStyleImageDigest) {
        if (styleTransferImage) {
          set({styleTransferImage: null});
        }
        return null;
      }
      if (styleTransferImage?.digest === storedStyleImageDigest) {
        return styleTransferImage;
      }
      try {
        const storedStyleImage = await getStyleImage();
        if (storedStyleImage?.digest !== storedStyleImageDigest) {
          throw new ImageUnreadableError(storedStyleImageDigest, storedStyleImage?.name);
        }
        const materializedStyleImage = await materializeImageFile(storedStyleImage);
        try {
          (await createImageBitmap(materializedStyleImage.blob)).close();
        } catch (error) {
          throw new ImageUnreadableError(storedStyleImageDigest, storedStyleImage.name, error);
        }
        if (get().appSettings.styleTransferImageDigest !== storedStyleImageDigest) {
          return await get().loadStyleImage();
        }
        set({
          styleTransferImage: materializedStyleImage,
        });
        return materializedStyleImage;
      } catch (error) {
        if (!(error instanceof ImageUnreadableError)) {
          throw error;
        }
        console.error(error);
        await discardStyleImage(storedStyleImageDigest);
        return null;
      }
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
      await styleTransferOperation.run(async signal => {
        const styleTransferImage = numInputs > 1 ? await get().loadStyleImage() : null;
        signal.throwIfAborted();
        if (numInputs > 1 && !styleTransferImage) {
          return;
        }
        const digests = [
          selectedImageFile.digest,
          ...(styleTransferImage ? [styleTransferImage.digest] : []),
        ];
        let styledImageBlob: Blob;
        try {
          styledImageBlob = await withProcessedImageBlobCache(
            styleTransferModel,
            digests,
            async () => {
              let styleImage: ImageBitmap | null = null;
              if (styleTransferImage) {
                try {
                  styleImage = await createImageBitmap(imageFileToFile(styleTransferImage));
                } catch (error) {
                  throw new ImageUnreadableError(
                    styleTransferImage.digest,
                    styleTransferImage.name,
                    error
                  );
                }
              }
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
        } catch (error) {
          signal.throwIfAborted();
          if (!(error instanceof ImageUnreadableError)) {
            throw error;
          }
          console.error(error);
          await discardStyleImage(error.digest);
          return;
        }
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
