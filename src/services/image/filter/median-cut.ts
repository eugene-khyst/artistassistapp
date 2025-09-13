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
  const pixelCount = Math.floor(data.length / 4);

  const dataLinear = new Float32Array(pixelCount * 3);
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const linearOffset = i * 3;
    for (let channel = 0; channel < 3; channel++) {
      dataLinear[linearOffset + channel] = linearizeRgbChannel(data[offset + channel]!);
    }
  }

  const indexes = new Uint32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    indexes[i] = i * 3;
  }

  medianCut(indexes, depth, dataLinear, transformMean);

  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const linearOffset = i * 3;
    for (let channel = 0; channel < 3; channel++) {
      data[offset + channel] = unlinearizeRgbChannel(dataLinear[linearOffset + channel]!);
    }
  }
}

function medianCut(
  indexes: Uint32Array,
  depth: number,
  dataLinear: Float32Array,
  transformMean: (mean: RgbTuple) => RgbTuple
): void {
  if (indexes.length === 0) {
    return;
  }

  if (depth <= 0 || indexes.length <= 1) {
    quantize(indexes, dataLinear, transformMean);
    return;
  }

  const minValue: RgbTuple = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];
  const maxValue: RgbTuple = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (const i of indexes) {
    for (let channel = 0; channel < 3; channel++) {
      const value = dataLinear[i + channel]!;
      if (value < minValue[channel]!) {
        minValue[channel] = value;
      }
      if (value > maxValue[channel]!) {
        maxValue[channel] = value;
      }
    }
  }

  const ranges = [0, 0, 0];
  let maxRange = Number.NEGATIVE_INFINITY;
  let maxChannel = 0;
  for (let channel = 0; channel < 3; channel++) {
    ranges[channel] = maxValue[channel]! - minValue[channel]!;
    if (ranges[channel]! > maxRange) {
      maxRange = ranges[channel]!;
      maxChannel = channel;
    }
  }

  indexes.sort((a, b) => dataLinear[a + maxChannel]! - dataLinear[b + maxChannel]!);

  const mid = Math.floor(indexes.length / 2);
  const left = indexes.subarray(0, mid);
  const right = indexes.subarray(mid, indexes.length);

  medianCut(left, depth - 1, dataLinear, transformMean);
  medianCut(right, depth - 1, dataLinear, transformMean);
}

function quantize(
  indexes: Uint32Array,
  dataLinear: Float32Array,
  transformMean: (mean: RgbTuple) => RgbTuple
): void {
  if (indexes.length === 0) {
    return;
  }

  const total: RgbTuple = [0, 0, 0];
  for (const i of indexes) {
    for (let channel = 0; channel < 3; channel++) {
      total[channel]! += dataLinear[i + channel]!;
    }
  }
  const numPixels = indexes.length;
  const meanSrgb: RgbTuple = [0, 0, 0];
  for (let channel = 0; channel < 3; channel++) {
    meanSrgb[channel] = unlinearizeRgbChannel(total[channel]! / numPixels);
  }
  const transformedMeanSrgb = transformMean(meanSrgb);
  const meanLinear: RgbTuple = [0, 0, 0];
  for (let channel = 0; channel < 3; channel++) {
    meanLinear[channel] = linearizeRgbChannel(transformedMeanSrgb[channel]!);
  }
  for (const i of indexes) {
    dataLinear.set(meanLinear, i);
  }
}
