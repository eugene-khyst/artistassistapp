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
  readStyleImage,
  saveStyleImage,
} from '@/services/db/style-image-db';
import {ImageUnreadableError} from '@/services/image/errors';
import {type ImageFile} from '@/services/image/image-file';
import {
  CUSTOM_STYLE_IMAGE_ID,
  fetchStyleImageFile,
  type StyleImageDefinition,
} from '@/services/image/style-images';
import {transformImage, withProcessedImageBlobCache} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import {
  type OriginalImageSlice,
  registerOriginalImageDependency,
} from '@/stores/original-image-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';

export interface StyleTransferSlice {
  styleTransferModel?: OnnxModel;
  styleTransferImage?: StyleImageDefinition;
  customStyleImage: ImageFile | null;
  isStyleTransferLoading: boolean;
  styleTransferDownloadTip: string | null;
  styleTransferResultBlob: Blob | null;

  setStyleTransferModel: (styleTransferModel?: OnnxModel) => void;
  setStyleTransferImage: (styleTransferImage?: StyleImageDefinition) => void;
  saveCustomStyleImage: (customStyleImage: ImageFile | null) => Promise<void>;
  loadCustomStyleImage: () => Promise<ImageFile | null>;
  refreshStyleTransfer: () => Promise<void>;
  transferStyle: () => Promise<void>;
  abortStyleTransfer: () => void;
}

type StyleTransferSliceDependencies = Pick<AppSlice, 'appSettings'> &
  Pick<OriginalImageSlice, 'selectedImageFile' | 'originalImage'> &
  Pick<AuthSlice, 'auth'>;

export const createStyleTransferSlice: StateCreator<
  StyleTransferSlice & StyleTransferSliceDependencies,
  [],
  [],
  StyleTransferSlice
> = (set, get) => {
  const styleTransferOperation = createAbortableOperation({
    onStart: () => {
      set({
        styleTransferResultBlob: null,
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

  registerOriginalImageDependency({
    abort: () => {
      styleTransferOperation.abort();
    },
    clear: () => {
      set({
        styleTransferResultBlob: null,
      });
    },
  });

  const discardCustomStyleImage = async (expectedDigest: string): Promise<void> => {
    const {appSettings, discarded} = await discardStoredStyleImage(expectedDigest);
    if (!discarded) {
      return;
    }
    styleTransferOperation.abort();
    set({
      appSettings,
      customStyleImage: null,
      styleTransferResultBlob: null,
    });
  };

  const runStyleTransfer = async (): Promise<void> => {
    const {selectedImageFile, originalImage, styleTransferModel, styleTransferImage, auth} = get();
    if (
      !selectedImageFile ||
      !originalImage ||
      !styleTransferModel ||
      !styleTransferImage ||
      !hasAccessTo(auth?.user, styleTransferModel)
    ) {
      styleTransferOperation.abort();
      set({
        styleTransferResultBlob: null,
      });
      return;
    }
    await styleTransferOperation.run(async signal => {
      const {id, image} = styleTransferImage;
      const styleImageFile =
        id === CUSTOM_STYLE_IMAGE_ID
          ? await get().loadCustomStyleImage()
          : await fetchStyleImageFile(image, signal);
      signal.throwIfAborted();
      if (!styleImageFile) {
        return;
      }
      try {
        const styleTransferResultBlob = await withProcessedImageBlobCache(
          styleTransferModel,
          [selectedImageFile.digest, styleImageFile.digest],
          async () => {
            let styleImage: ImageBitmap;
            try {
              styleImage = await createImageBitmap(styleImageFile.blob);
            } catch (error) {
              throw new ImageUnreadableError(styleImageFile.digest, styleImageFile.name, error);
            }
            try {
              return await transformImage(
                [originalImage, styleImage],
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
              styleImage.close();
            }
          }
        );
        signal.throwIfAborted();
        set({
          styleTransferResultBlob,
        });
      } catch (error) {
        signal.throwIfAborted();
        if (!(error instanceof ImageUnreadableError) || id !== CUSTOM_STYLE_IMAGE_ID) {
          throw error;
        }
        console.error(error);
        await discardCustomStyleImage(error.digest);
      }
    });
  };

  return {
    customStyleImage: null,
    isStyleTransferLoading: false,
    styleTransferDownloadTip: null,
    styleTransferResultBlob: null,

    setStyleTransferModel: (styleTransferModel?: OnnxModel): void => {
      if (get().styleTransferModel === styleTransferModel) {
        return;
      }
      set({
        styleTransferModel,
      });
      void runStyleTransfer();
    },

    setStyleTransferImage: (styleTransferImage?: StyleImageDefinition): void => {
      if (get().styleTransferImage?.id === styleTransferImage?.id) {
        return;
      }
      set({
        styleTransferImage,
      });
      void runStyleTransfer();
    },

    saveCustomStyleImage: async (customStyleImage: ImageFile | null): Promise<void> => {
      const appSettings = await saveStyleImage(customStyleImage);
      set({
        appSettings,
        customStyleImage,
      });
      if (get().styleTransferImage?.id === CUSTOM_STYLE_IMAGE_ID) {
        await runStyleTransfer();
      }
    },

    loadCustomStyleImage: async (): Promise<ImageFile | null> => {
      const {customStyleImage, appSettings} = get();
      const storedDigest = appSettings.styleTransferImageDigest;
      if (!storedDigest) {
        if (customStyleImage) {
          set({
            customStyleImage: null,
          });
        }
        return null;
      }
      if (customStyleImage?.digest === storedDigest) {
        return customStyleImage;
      }
      try {
        const styleImage = await readStyleImage(storedDigest);
        if (get().appSettings.styleTransferImageDigest !== storedDigest) {
          return null;
        }
        set({
          customStyleImage: styleImage,
        });
        return styleImage;
      } catch (error) {
        if (!(error instanceof ImageUnreadableError)) {
          throw error;
        }
        console.error(error);
        await discardCustomStyleImage(storedDigest);
        return null;
      }
    },

    refreshStyleTransfer: async (): Promise<void> => {
      set({
        customStyleImage: null,
      });
      await runStyleTransfer();
    },

    transferStyle: async (): Promise<void> => {
      const {styleTransferResultBlob, isStyleTransferLoading} = get();
      if (styleTransferResultBlob || isStyleTransferLoading) {
        return;
      }
      await runStyleTransfer();
    },

    abortStyleTransfer: (): void => {
      styleTransferOperation.abort();
    },
  };
};
