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

import {adjustColors} from '@eugene-khyst/artistassistapp-image-processing/adjust-colors';
import {RgbChannelsPercentileCalculator} from '@eugene-khyst/artistassistapp-image-processing/rgb-channels-percentile';
import {extractTonalValues} from '@eugene-khyst/artistassistapp-image-processing/tonal-values';
import {
  createImageBitmapAndResize,
  IMAGE_SIZE,
  ResizeImage,
  toOffscreenCanvas,
} from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';
import type {StateCreator} from 'zustand';

import {defaultAdjustColorsControls} from '@/services/image/adjust-colors-controls';
import {createAbortableOperation} from '@/utils/abortable-operation';

import {type OriginalImageSlice, registerOriginalImageDependency} from './original-image-slice';

export interface TonalValuesSlice {
  tonalImages: ImageBitmap[];
  comparisonTonalImages: ImageBitmap[];
  isTonalImagesLoading: boolean;
  isComparisonTonalImagesLoading: boolean;

  loadTonalImages: () => void;
  loadComparisonTonalImages: (file: File) => Promise<boolean>;
  clearComparisonTonalImages: () => void;
}

type TonalValuesSliceDependencies = Pick<OriginalImageSlice, 'originalImage'>;

const closeImages = (images: ImageBitmap[]): void => {
  images.forEach(image => {
    image.close();
  });
};

const percentileWhiteBalance = (image: ImageBitmap): OffscreenCanvas => {
  const canvas = toOffscreenCanvas(image);
  const calculator = new RgbChannelsPercentileCalculator();
  calculator.setImage(canvas);
  const maxValues = calculator.calculatePercentiles(defaultAdjustColorsControls().percentile / 100);
  return adjustColors(canvas, {}, {maxValues});
};

export const createTonalValuesSlice: StateCreator<
  TonalValuesSlice & TonalValuesSliceDependencies,
  [],
  [],
  TonalValuesSlice
> = (set, get) => {
  const comparisonOperation = createAbortableOperation({
    onStart: () => {
      set({
        isComparisonTonalImagesLoading: true,
      });
    },
    onFinish: () => {
      set({
        isComparisonTonalImagesLoading: false,
      });
    },
  });

  const replaceComparisonTonalImages = (comparisonTonalImages: ImageBitmap[]): void => {
    const prev = get().comparisonTonalImages;
    set({
      comparisonTonalImages,
    });
    closeImages(prev);
  };

  registerOriginalImageDependency({
    abort: () => {
      comparisonOperation.abort();
    },
    clear: () => {
      const {tonalImages, comparisonTonalImages} = get();
      set({
        tonalImages: [],
        comparisonTonalImages: [],
      });
      closeImages(tonalImages);
      closeImages(comparisonTonalImages);
    },
  });

  return {
    tonalImages: [],
    isTonalImagesLoading: false,
    comparisonTonalImages: [],
    isComparisonTonalImagesLoading: false,

    loadTonalImages: (): void => {
      const {originalImage, tonalImages} = get();
      if (tonalImages.length || !originalImage) {
        return;
      }
      set({
        isTonalImagesLoading: true,
      });
      const newTonalImages = extractTonalValues(originalImage);
      set({
        tonalImages: newTonalImages,
        isTonalImagesLoading: false,
      });
    },

    loadComparisonTonalImages: async (file: File): Promise<boolean> => {
      const isLoaded = await comparisonOperation.runAndCommit(
        async signal => {
          const image = await createImageBitmapAndResize(
            file,
            ResizeImage.resizeToPixelCount(IMAGE_SIZE['2K'])
          );
          try {
            signal.throwIfAborted();
            return extractTonalValues(percentileWhiteBalance(image));
          } finally {
            image.close();
          }
        },
        comparisonTonalImages => {
          replaceComparisonTonalImages(comparisonTonalImages);
          return true;
        },
        closeImages
      );
      return !!isLoaded;
    },

    clearComparisonTonalImages: (): void => {
      comparisonOperation.abort();
      replaceComparisonTonalImages([]);
    },
  };
};
