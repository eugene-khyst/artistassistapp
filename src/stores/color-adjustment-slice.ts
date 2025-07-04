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

import {
  type AdjustmentParameters,
  getColorAdjustedImage,
} from '~/src/services/image/color-adjustment';
import type {RgbChannelsPercentileCalculator} from '~/src/services/image/rgb-channels-percentile';
import {createImageBitmapResizedTotalPixels} from '~/src/utils/graphics';

const rgbChannelsPercentileCalculator: Remote<RgbChannelsPercentileCalculator> = wrap(
  new Worker(
    new URL('../services/image/worker/rgb-channels-percentile-worker.ts', import.meta.url),
    {
      type: 'module',
    }
  )
);

export interface ColorAdjustmentSlice {
  imageFileToAdjustColors: File | null;
  colorUnadjustedImage: ImageBitmap | null;
  colorAdjustedImage: ImageBitmap | null;
  isColorAdjustedImageLoading: boolean;

  setImageFileToAdjustColors: (imageFileToAdjustColors: File | null) => Promise<void>;
  adjustImageColors: (
    whitePatchPercentile: number,
    adjustmentParams: AdjustmentParameters
  ) => Promise<void>;
}

export const createColorAdjustmentSlice: StateCreator<
  ColorAdjustmentSlice,
  [],
  [],
  ColorAdjustmentSlice
> = (set, get) => ({
  imageFileToAdjustColors: null,
  colorUnadjustedImage: null,
  colorAdjustedImage: null,
  isColorAdjustedImageLoading: false,
  setImageFileToAdjustColors: async (imageFileToAdjustColors: File | null): Promise<void> => {
    const {
      colorUnadjustedImage: prevColorUnadjustedImage,
      colorAdjustedImage: prevColorAdjustedImage,
    } = get();
    let colorUnadjustedImage: ImageBitmap | null = null;
    if (imageFileToAdjustColors) {
      set({
        isColorAdjustedImageLoading: true,
      });
      await rgbChannelsPercentileCalculator.setImage(imageFileToAdjustColors);
      colorUnadjustedImage = await createImageBitmapResizedTotalPixels(
        imageFileToAdjustColors,
        10e6
      );
    }
    set({
      imageFileToAdjustColors,
      colorUnadjustedImage,
      colorAdjustedImage: null,
      isColorAdjustedImageLoading: false,
    });
    [prevColorUnadjustedImage, prevColorAdjustedImage].forEach(prev => prev?.close());
  },
  adjustImageColors: async (
    whitePatchPercentile: number,
    adjustmentParams: AdjustmentParameters
  ): Promise<void> => {
    const {colorUnadjustedImage, colorAdjustedImage: prev} = get();
    if (!colorUnadjustedImage) {
      return;
    }
    set({
      isColorAdjustedImageLoading: true,
    });
    const maxValues: number[] =
      await rgbChannelsPercentileCalculator.calculatePercentiles(whitePatchPercentile);
    const colorAdjustedImage = getColorAdjustedImage(
      colorUnadjustedImage,
      maxValues,
      adjustmentParams
    );
    set({
      colorAdjustedImage,
      isColorAdjustedImageLoading: false,
    });
    prev?.close();
  },
});
