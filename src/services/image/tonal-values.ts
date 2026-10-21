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

import {clamp, rgbToHex} from '@eugene-khyst/artistassistapp-color-mixer';

import {TONAL_VALUE_THRESHOLDS, TONAL_VALUES, TonalValue} from '@/services/color/tonal-value';
import {colorMapFilterWebGL} from '@/services/image/filter/color-map-webgl';
import {interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {thresholdFilterWebGL} from '@/services/image/filter/threshold-webgl';
import {Interpolation} from '@/services/image/filter/types';
import {
  type DrawImageSource,
  imageDataToOffscreenCanvas,
  toOffscreenCanvas,
} from '@/utils/graphics';

const GRAY_LEVELS: Record<TonalValue, number> = {
  [TonalValue.Shadows]: 0,
  [TonalValue.Midtones]: 1 / 3,
  [TonalValue.LightTones]: 2 / 3,
  [TonalValue.Highlights]: 1,
};

export const TONAL_IMAGE_VALUES = [
  TonalValue.LightTones,
  TonalValue.Midtones,
  TonalValue.Shadows,
].sort((a, b) => GRAY_LEVELS[b] - GRAY_LEVELS[a]);

export const TONAL_VALUE_HEXES = Object.fromEntries(
  TONAL_VALUES.map((tonalValue: TonalValue): [TonalValue, string] => [
    tonalValue,
    grayLevelToHex(GRAY_LEVELS[tonalValue]),
  ])
) as Record<TonalValue, string>;

const COLOR_MAP_LEGEND_HEIGHT_RATIO = 0.015;
const COLOR_MAP_LEGEND_MIN_HEIGHT = 12;
const COLOR_MAP_LEGEND_MAX_HEIGHT = 40;

export function extractTonalValues(image: DrawImageSource): ImageBitmap[] {
  const canvas = toOffscreenCanvas(image);
  const tonalValues: ImageBitmap[] = thresholdFilterWebGL(
    canvas,
    TONAL_VALUE_THRESHOLDS,
    TONAL_IMAGE_VALUES.map(tonalValue => GRAY_LEVELS[tonalValue]),
    {
      gaussianBlurKernelSize: 5,
    }
  ).map(tonalValue => tonalValue.transferToImageBitmap());
  const [colorMap, colorMapLegend] = colorMapFilterWebGL(canvas);
  addColorMapLegend(colorMap, colorMapLegend);
  return [...tonalValues, colorMap.transferToImageBitmap()];
}

function grayLevelToHex(grayLevel: number): string {
  const value = 255 * grayLevel;
  return rgbToHex(value, value, value);
}

function addColorMapLegend(colorMap: OffscreenCanvas, colorMapLegend: ImageData): void {
  const legendHeight = clamp(
    Math.round(colorMap.height * COLOR_MAP_LEGEND_HEIGHT_RATIO),
    COLOR_MAP_LEGEND_MIN_HEIGHT,
    COLOR_MAP_LEGEND_MAX_HEIGHT
  );
  const lightnessLegend = createLightnessLegend();
  const ctx = colorMap.getContext('2d')!;
  drawLegend(ctx, colorMapLegend, colorMap.width, legendHeight, colorMap.height - legendHeight);
  drawLegend(
    ctx,
    lightnessLegend,
    colorMap.width,
    legendHeight,
    colorMap.height - 2 * legendHeight
  );
}

function drawLegend(
  ctx: OffscreenCanvasRenderingContext2D,
  legend: ImageData,
  width: number,
  height: number,
  y: number
): void {
  const scaledLegend = interpolationWebGL(
    imageDataToOffscreenCanvas(legend),
    width,
    height,
    Interpolation.Linear
  );
  ctx.drawImage(scaledLegend, 0, y);
}

function createLightnessLegend(): ImageData {
  return new ImageData(new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255]), 2, 1);
}
