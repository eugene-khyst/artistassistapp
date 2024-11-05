/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import type {RgbTuple} from '~/src/services/color/space';
import {linearizeRgbChannel, unlinearizeRgbChannel} from '~/src/services/color/space';

interface BucketItem {
  color: RgbTuple;
  index: number;
}

export function medianCutQuantization(
  imageData: ImageData,
  depth = 8,
  transformMean: (mean: RgbTuple) => RgbTuple = mean => mean
): void {
  const {data} = imageData;
  const bucket: BucketItem[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    bucket.push({
      color: [r, g, b],
      index: i,
    });
  }
  medianCut(bucket, depth, data, transformMean);
}

function medianCut(
  bucket: BucketItem[],
  depth: number,
  data: Uint8ClampedArray,
  transformMean: (mean: RgbTuple) => RgbTuple
): void {
  if (depth == 0) {
    quantize(bucket, data, transformMean);
    return;
  }

  const minimumValue: RgbTuple = [256, 256, 256];
  const maximumValue: RgbTuple = [0, 0, 0];
  for (const item of bucket) {
    for (let channel = 0; channel <= 2; channel++) {
      const value = item.color[channel]!;
      if (value < minimumValue[channel]!) {
        minimumValue[channel] = value;
      }
      if (value > maximumValue[channel]!) {
        maximumValue[channel] = value;
      }
    }
  }

  const ranges: number[] = [
    maximumValue[0] - minimumValue[0],
    maximumValue[1] - minimumValue[1],
    maximumValue[2] - minimumValue[2],
  ];

  const maxRange = Math.max(...ranges);
  const maxChannel = ranges.indexOf(maxRange);

  bucket.sort(({color: a}: BucketItem, {color: b}: BucketItem) => a[maxChannel]! - b[maxChannel]!);

  const medianIndex: number = bucket.length / 2;
  medianCut(bucket.slice(0, medianIndex), depth - 1, data, transformMean);
  medianCut(bucket.slice(medianIndex, bucket.length), depth - 1, data, transformMean);
}

function quantize(
  bucket: BucketItem[],
  data: Uint8ClampedArray,
  transformMean: (mean: RgbTuple) => RgbTuple
): void {
  const total: RgbTuple = [0, 0, 0];
  for (const {color} of bucket) {
    for (let channel = 0; channel <= 2; channel++) {
      total[channel]! += linearizeRgbChannel(color[channel]!);
    }
  }
  const mean: RgbTuple = [0, 0, 0];
  for (let channel = 0; channel <= 2; channel++) {
    mean[channel] = unlinearizeRgbChannel(total[channel]! / bucket.length);
  }
  const [r, g, b] = transformMean(mean);
  for (const {index} of bucket) {
    data[index] = r;
    data[index + 1] = g;
    data[index + 2] = b;
    data[index + 3] = 255;
  }
}
