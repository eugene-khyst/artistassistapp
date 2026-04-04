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

import {blobToImageFile, type ImageFile} from '~/src/services/image/image-file';
import {getPosterizedImage} from '~/src/services/image/worker/color-quantization-worker-manager';
import type {OriginalImageSlice} from '~/src/stores/original-image-slice';
import {imageBitmapToBlob} from '~/src/utils/graphics';
import {isAbortError} from '~/src/utils/promise';

export interface PosterizedImageSlice {
  isPosterizedImageLoading: boolean;
  posterizeImageAbortController: AbortController | null;

  posterizeImage: (quantizationDepth: number) => Promise<void>;
  abortPosterizeImage: () => void;
}

export const createPosterizedImageSlice: StateCreator<
  PosterizedImageSlice & OriginalImageSlice,
  [],
  [],
  PosterizedImageSlice
> = (set, get) => ({
  isPosterizedImageLoading: false,
  posterizeImageAbortController: null,

  posterizeImage: async (quantizationDepth: number): Promise<void> => {
    const {originalImageFile} = get();
    if (!originalImageFile) {
      return;
    }
    try {
      const posterizeImageAbortController = new AbortController();
      set({
        isPosterizedImageLoading: true,
        posterizeImageAbortController,
      });
      const posterizedImage: ImageBitmap = await getPosterizedImage(
        originalImageFile,
        quantizationDepth,
        posterizeImageAbortController.signal
      );
      const imageFile: ImageFile = await blobToImageFile(
        await imageBitmapToBlob(posterizedImage),
        `${originalImageFile.name} ${2 ** quantizationDepth} colors`.trim()
      );
      posterizedImage.close();
      await get().saveRecentImageFile(imageFile);
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      set({
        isPosterizedImageLoading: false,
        posterizeImageAbortController: null,
      });
    }
  },
  abortPosterizeImage: (): void => {
    get().posterizeImageAbortController?.abort();
  },
});
