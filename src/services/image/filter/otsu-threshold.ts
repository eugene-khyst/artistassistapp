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

import {rgbToOklab} from '~/src/services/color/space/oklab';
import {clamp} from '~/src/utils/math-utils';

export function computeOtsuThreshold({data}: ImageData, grayscaleInput = false): number {
  console.time('compute-otsu-threshold');
  if (!data.length) {
    return 0.5;
  }
  const hist = new Int32Array(256);
  const total = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    let bin: number;
    if (grayscaleInput) {
      bin = data[i]!;
    } else {
      const [l] = rgbToOklab(data[i]!, data[i + 1]!, data[i + 2]!);
      bin = clamp(Math.round(l * 255), 0, 255);
    }
    hist[bin]!++;
  }
  let totalMoment = 0;
  for (let i = 0; i < 256; i++) {
    totalMoment += i * hist[i]!;
  }
  let backgroundMoment = 0;
  let backgroundWeight = 0;
  let maxVariance = 0;
  let bestThreshold = 0;
  for (let i = 0; i < 256; i++) {
    backgroundWeight += hist[i]!;
    if (backgroundWeight === 0) {
      continue;
    }
    const foregroundWeight = total - backgroundWeight;
    if (foregroundWeight === 0) {
      break;
    }
    backgroundMoment += i * hist[i]!;
    const meanBackground = backgroundMoment / backgroundWeight;
    const meanForeground = (totalMoment - backgroundMoment) / foregroundWeight;
    const variance =
      backgroundWeight *
      foregroundWeight *
      (meanBackground - meanForeground) *
      (meanBackground - meanForeground);
    if (variance > maxVariance) {
      maxVariance = variance;
      bestThreshold = i;
    }
  }
  console.timeEnd('compute-otsu-threshold');
  return bestThreshold / 255;
}
