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

import {hexToRgb, linearizeRgbChannel} from '~/src/services/color/space/rgb';
import {
  type AdjustmentParameters,
  getColorAdjustedImage,
} from '~/src/services/image/color-adjustment';
import {rgbChannelsPercentileCalculator} from '~/src/services/image/worker/rgb-channels-percentile-worker-manager';
import {
  createImageBitmapAndResize,
  IMAGE_SIZE,
  ResizeImage,
  resizeImageBitmap,
} from '~/src/utils/graphics';

export interface ColorAdjustmentSlice {
  imageFileToAdjustColors: File | null;
  colorUnadjustedImage: ImageBitmap | null;
  colorAdjustedImage: ImageBitmap | null;
  isColorAdjustedImageLoading: boolean;

  setImageFileToAdjustColors: (imageFileToAdjustColors: File | null) => Promise<void>;
  adjustImageColors: (maxValues: number[], params: AdjustmentParameters) => void;
  adjustImageColorsPercentile: (percentile: number, params: AdjustmentParameters) => Promise<void>;
  adjustImageColorsReference: (whitePoint: string, params: AdjustmentParameters) => void;
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
      colorUnadjustedImage = await createImageBitmapAndResize(
        imageFileToAdjustColors,
        ResizeImage.resizeToPixelCount(10e6)
      );
      const resizedImage = await resizeImageBitmap(
        colorUnadjustedImage,
        ResizeImage.resizeToPixelCount(IMAGE_SIZE['2K'])
      );
      await rgbChannelsPercentileCalculator.setImage(transfer(resizedImage, [resizedImage]));
    }
    set({
      imageFileToAdjustColors,
      colorUnadjustedImage,
      colorAdjustedImage: null,
      isColorAdjustedImageLoading: false,
    });
    [prevColorUnadjustedImage, prevColorAdjustedImage].forEach(prev => prev?.close());
  },
  adjustImageColors: (maxValues: number[], params: AdjustmentParameters): void => {
    const {colorUnadjustedImage, colorAdjustedImage: prev} = get();
    if (!colorUnadjustedImage) {
      return;
    }
    set({
      isColorAdjustedImageLoading: true,
    });
    const colorAdjustedImage = getColorAdjustedImage(colorUnadjustedImage, maxValues, params);
    set({
      colorAdjustedImage,
      isColorAdjustedImageLoading: false,
    });
    prev?.close();
  },
  adjustImageColorsPercentile: async (
    percentile: number,
    params: AdjustmentParameters
  ): Promise<void> => {
    const maxValues: number[] =
      await rgbChannelsPercentileCalculator.calculatePercentiles(percentile);
    get().adjustImageColors(maxValues, params);
  },
  adjustImageColorsReference: (whitePoint: string, params: AdjustmentParameters): void => {
    const maxValues: number[] = hexToRgb(whitePoint).map(v => linearizeRgbChannel(v));
    get().adjustImageColors(maxValues, params);
  },
});
