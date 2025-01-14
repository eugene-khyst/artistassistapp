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

import type {RgbTuple} from '~/src/services/color/space/rgb';
import {linearizeRgbChannel, unlinearizeRgbChannel} from '~/src/services/color/space/rgb';

export function medianCutQuantization(
  imageData: ImageData,
  depth = 8,
  transformMean: (mean: RgbTuple) => RgbTuple = mean => mean
): void {
  const {data} = imageData;
  const bucketSize = Math.ceil(data.length / 4);
  const indexes: Uint32Array = new Uint32Array(bucketSize);
  let j = 0;
  for (let i = 0; i < data.length; i += 4) {
    indexes[j] = i;
    j++;
  }
  medianCut(indexes, depth, data, transformMean);
}

function medianCut(
  indexes: Uint32Array,
  depth: number,
  data: Uint8ClampedArray,
  transformMean: (mean: RgbTuple) => RgbTuple
): void {
  if (depth == 0) {
    quantize(indexes, data, transformMean);
    return;
  }

  const minimumValue: RgbTuple = [255, 255, 255];
  const maximumValue: RgbTuple = [0, 0, 0];
  for (const i of indexes) {
    const rgb = data.subarray(i, i + 3);
    for (let channel = 0; channel < 3; channel++) {
      const value = rgb[channel]!;
      if (value < minimumValue[channel]!) {
        minimumValue[channel] = value;
      }
      if (value > maximumValue[channel]!) {
        maximumValue[channel] = value;
      }
    }
  }

  const ranges = [0, 0, 0].map((_, i) => maximumValue[i]! - minimumValue[i]!);

  const maxRange = Math.max(...ranges);
  const maxChannel = ranges.indexOf(maxRange);

  indexes.sort((a, b) => data[a + maxChannel]! - data[b + maxChannel]!);

  const medianIndex: number = Math.trunc(indexes.length) / 2;
  medianCut(indexes.subarray(0, medianIndex), depth - 1, data, transformMean);
  medianCut(indexes.subarray(medianIndex, indexes.length), depth - 1, data, transformMean);
}

function quantize(
  indexes: Uint32Array,
  data: Uint8ClampedArray,
  transformMean: (mean: RgbTuple) => RgbTuple
): void {
  const total: RgbTuple = [0, 0, 0];
  for (const i of indexes) {
    for (let channel = 0; channel < 3; channel++) {
      total[channel]! += linearizeRgbChannel(data[i + channel]!);
    }
  }
  const mean: RgbTuple = [0, 0, 0];
  for (let channel = 0; channel < 3; channel++) {
    mean[channel] = unlinearizeRgbChannel(total[channel]! / indexes.length);
  }
  const rgb = transformMean(mean);
  for (const i of indexes) {
    data.set(rgb, i);
  }
}
