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

import {adjustColorsWebGL} from '~/src/services/image/filter/color-adjustment-webgl';

export interface AdjustmentParameters {
  saturation?: number;
  inputLow?: number;
  inputHigh?: number;
  gamma?: number;
  outputLow?: number;
  outputHigh?: number;
  origTemperature?: number;
  targetTemperature?: number;
}

export function getColorAdjustedImage(
  image: ImageBitmap,
  maxValues: number[],
  adjustmentParams: AdjustmentParameters
): ImageBitmap {
  console.time('color-adjustment');
  const colorAdjustedImage: ImageBitmap = adjustColorsWebGL(image, maxValues, adjustmentParams);
  console.timeEnd('color-adjustment');
  return colorAdjustedImage;
}
