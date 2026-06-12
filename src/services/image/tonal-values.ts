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

import {rgbToHex} from '@/services/color/space/rgb';
import {colorMapFilterWebGL} from '@/services/image/filter/color-map-webgl';
import {Interpolation, interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {thresholdFilterWebGL} from '@/services/image/filter/threshold-webgl';
import type {DrawImageSource} from '@/utils/graphics';
import {imageDataToOffscreenCanvas} from '@/utils/graphics';
import {clamp} from '@/utils/math-utils';

const THRESHOLDS = [0.825, 0.6, 0.35];
const TONAL_VALUES: number[] = [2 / 3, 1 / 3, 0];
export const TONAL_VALUE_HEXES: string[] = TONAL_VALUES.map(v => 255 * v).map(v =>
  rgbToHex(v, v, v)
);

const COLOR_MAP_LEGEND_HEIGHT_RATIO = 0.015;
const COLOR_MAP_LEGEND_MIN_HEIGHT = 12;
const COLOR_MAP_LEGEND_MAX_HEIGHT = 40;

export function getTonalValues(image: DrawImageSource): ImageBitmap[] {
  console.time('tonal-values');
  const tonalValues: ImageBitmap[] = thresholdFilterWebGL(image, THRESHOLDS, TONAL_VALUES).map(
    canvas => canvas.transferToImageBitmap()
  );
  const [colorMap, colorMapLegend] = colorMapFilterWebGL(image);
  addColorMapLegend(colorMap, colorMapLegend);
  console.timeEnd('tonal-values');
  return [...tonalValues, colorMap.transferToImageBitmap()];
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
