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

import {transfer} from 'comlink';
import type {StateCreator} from 'zustand';

import {blobToImageFile, type ImageFile} from '@/services/image/image-file';
import {colorQuantizationWorker} from '@/services/image/worker/color-quantization-worker-manager';
import {type OriginalImageSlice, registerProcessedImage} from '@/stores/original-image-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {IMAGE_SIZE, imageBitmapToBlob, ResizeImage, resizeImageBitmap} from '@/utils/graphics';

export interface PosterizedImageSlice {
  isPosterizedImageLoading: boolean;

  posterizeImage: (maxColors: number) => Promise<void>;
  abortPosterizeImage: () => void;
}

type PosterizedImageSliceDependencies = Pick<
  OriginalImageSlice,
  'selectedImageFile' | 'originalImage' | 'saveRecentImageFile'
>;

export const createPosterizedImageSlice: StateCreator<
  PosterizedImageSlice & PosterizedImageSliceDependencies,
  [],
  [],
  PosterizedImageSlice
> = (set, get) => {
  const posterizeImageOperation = createAbortableOperation({
    onStart: () => {
      set({
        isPosterizedImageLoading: true,
      });
    },
    onFinish: () => {
      set({
        isPosterizedImageLoading: false,
      });
    },
  });

  registerProcessedImage({
    abort: () => {
      posterizeImageOperation.abort();
    },
  });

  return {
    isPosterizedImageLoading: false,

    posterizeImage: async (maxColors: number): Promise<void> => {
      get().abortPosterizeImage();
      const {selectedImageFile, originalImage} = get();
      if (!selectedImageFile || !originalImage) {
        return;
      }
      await posterizeImageOperation.run(async signal => {
        const resizedImage = await resizeImageBitmap(
          originalImage,
          ResizeImage.resizeToPixelCount(IMAGE_SIZE.SD)
        );
        const {quantizedImage} = await colorQuantizationWorker.run(
          worker => worker.getPosterizedImage(transfer(resizedImage, [resizedImage]), maxColors),
          signal
        );
        const posterizedImageFile: ImageFile = await blobToImageFile(
          await imageBitmapToBlob(quantizedImage, {encodeOptions: {type: 'image/png'}}),
          `${selectedImageFile.name ?? ''} ${maxColors} colors`.trim()
        );
        posterizedImageFile.maxColors = maxColors;
        quantizedImage.close();
        signal.throwIfAborted();
        await get().saveRecentImageFile(posterizedImageFile);
      });
    },

    abortPosterizeImage: (): void => {
      posterizeImageOperation.abort();
    },
  };
};
