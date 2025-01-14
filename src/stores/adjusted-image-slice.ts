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

import type {Remote} from 'comlink';
import {wrap} from 'comlink';
import type {StateCreator} from 'zustand';

import {type AdjustmentParameters, getAdjustedImage} from '~/src/services/image/color-correction';
import type {RgbChannelsPercentileCalculator} from '~/src/services/image/rgb-channels-percentile';

const rgbChannelsPercentileCalculator: Remote<RgbChannelsPercentileCalculator> = wrap(
  new Worker(
    new URL('../services/image/worker/rgb-channels-percentile-worker.ts', import.meta.url),
    {
      type: 'module',
    }
  )
);

export interface AdjustedImageSlice {
  imageFileToAdjust: File | null;
  unadjustedImage: ImageBitmap | null;
  adjustedImage: ImageBitmap | null;
  isAdjustedImageLoading: boolean;

  setImageFileToAdjust: (imageFileToAdjust: File | null) => Promise<void>;
  adjustImageColor: (
    whitePatchPercentile: number,
    adjustmentParams: AdjustmentParameters
  ) => Promise<void>;
}

export const createAdjustedImageSlice: StateCreator<
  AdjustedImageSlice,
  [],
  [],
  AdjustedImageSlice
> = (set, get) => ({
  imageFileToAdjust: null,
  unadjustedImage: null,
  adjustedImage: null,
  isAdjustedImageLoading: false,
  setImageFileToAdjust: async (imageFileToAdjust: File | null): Promise<void> => {
    const {unadjustedImage: prev} = get();
    let unadjustedImage: ImageBitmap | null = null;
    if (imageFileToAdjust) {
      unadjustedImage = await rgbChannelsPercentileCalculator.setImage(imageFileToAdjust);
    }
    set({
      imageFileToAdjust,
      unadjustedImage,
    });
    prev?.close();
  },
  adjustImageColor: async (
    whitePatchPercentile: number,
    adjustmentParams: AdjustmentParameters
  ): Promise<void> => {
    const {unadjustedImage, adjustedImage: prev} = get();
    if (!unadjustedImage) {
      return;
    }
    set({
      isAdjustedImageLoading: true,
    });
    const maxValues =
      await rgbChannelsPercentileCalculator.calculatePercentiles(whitePatchPercentile);
    const adjustedImage = getAdjustedImage(unadjustedImage, maxValues, adjustmentParams);
    set({
      adjustedImage,
      isAdjustedImageLoading: false,
    });
    prev?.close();
  },
});
