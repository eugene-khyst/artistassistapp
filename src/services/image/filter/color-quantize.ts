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

import type {OklabTuple} from '~/src/services/color/space/oklab';
import {
  deltaEOk,
  oklabToRgb,
  rgbToOklab,
  writeOklabToRgb,
  writeRgbToOklab,
} from '~/src/services/color/space/oklab';
import type {RgbTuple} from '~/src/services/color/space/rgb';
import {ditherOrdered} from '~/src/services/image/filter/dither';
import {quickselect} from '~/src/utils/quickselect';

const OVER_QUANTIZE_FACTOR = 3;

interface Bucket {
  start: number;
  end: number;
  maxRange: number;
  maxChannel: number;
}

interface Cluster {
  oklab: OklabTuple;
  count: number;
  ranges: {start: number; end: number}[];
}

export function rgbTransformInOklab(
  transformColor: (rgb: RgbTuple) => RgbTuple
): (oklab: OklabTuple) => OklabTuple {
  return ([l, a, b]: OklabTuple): OklabTuple => rgbToOklab(...transformColor(oklabToRgb(l, a, b)));
}

export function quantizeColors(
  imageData: ImageData,
  maxColors: number,
  dither = false,
  transformColor: (color: OklabTuple) => OklabTuple = color => color
): void {
  const {data, width, height} = imageData;
  const pixelCount = Math.floor(data.length / 4);

  const dataOklab = new Float32Array(pixelCount * 3);
  const indices = new Uint32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    writeRgbToOklab(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!, dataOklab, i * 3);
    indices[i] = i;
  }

  // Pass 1: Over-quantize
  const buckets = splitBuckets(dataOklab, indices, 0, pixelCount, maxColors * OVER_QUANTIZE_FACTOR);

  // Pass 2: Build clusters from bucket representatives
  const clusters = buildClusters(dataOklab, indices, buckets, transformColor);

  // Pass 3: Merge closest pairs until maxColors
  mergeClusters(clusters, maxColors);

  // Extract palette
  const palette: OklabTuple[] = clusters.map(({oklab}) => oklab);

  if (dither) {
    // Blue noise ordered dithering on original pixel data
    ditherOrdered(dataOklab, width, height, palette);
  } else {
    // Flat quantization: write cluster colors to pixel data
    for (const {
      oklab: [l, a, b],
      ranges,
    } of clusters) {
      for (const {start, end} of ranges) {
        for (let i = start; i < end; i++) {
          const io = indices[i]! * 3;
          dataOklab[io] = l;
          dataOklab[io + 1] = a;
          dataOklab[io + 2] = b;
        }
      }
    }
  }

  for (let i = 0; i < pixelCount; i++) {
    const o = i * 3;
    writeOklabToRgb(dataOklab[o]!, dataOklab[o + 1]!, dataOklab[o + 2]!, data, i * 4);
  }
}

function buildClusters(
  dataOklab: Float32Array,
  indices: Uint32Array,
  buckets: Bucket[],
  transformColor: (color: OklabTuple) => OklabTuple
): Cluster[] {
  return buckets.map(({start, end}) => {
    const count = end - start;
    const o = indices[start + Math.floor(count / 2)]! * 3;
    const oklab = transformColor([dataOklab[o]!, dataOklab[o + 1]!, dataOklab[o + 2]!]);
    return {oklab, count, ranges: [{start, end}]};
  });
}

function mergeClusters(clusters: Cluster[], maxColors: number): void {
  while (clusters.length > maxColors) {
    let minDist = Number.POSITIVE_INFINITY;
    let mergeI = 0;
    let mergeJ = 1;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = deltaEOk(...clusters[i]!.oklab, ...clusters[j]!.oklab);
        if (dist < minDist) {
          minDist = dist;
          mergeI = i;
          mergeJ = j;
        }
      }
    }

    // Keep the larger cluster's color (preserves real image colors)
    const [keepIdx, removeIdx] =
      clusters[mergeI]!.count >= clusters[mergeJ]!.count ? [mergeI, mergeJ] : [mergeJ, mergeI];
    const keep = clusters[keepIdx]!;
    const remove = clusters[removeIdx]!;
    keep.count += remove.count;
    keep.ranges.push(...remove.ranges);
    clusters.splice(removeIdx, 1);
  }
}

function splitBuckets(
  dataOklab: Float32Array,
  indices: Uint32Array,
  start: number,
  end: number,
  maxBuckets: number
): Bucket[] {
  const [initialRange, initialChannel] = computeBucketRange(dataOklab, indices, start, end);
  const buckets: Bucket[] = [{start, end, maxRange: initialRange, maxChannel: initialChannel}];

  while (buckets.length < maxBuckets) {
    let bestIdx = 0;
    for (let i = 1; i < buckets.length; i++) {
      if (buckets[i]!.maxRange > buckets[bestIdx]!.maxRange) {
        bestIdx = i;
      }
    }

    const bucket = buckets[bestIdx]!;
    if (bucket.maxRange <= 0) {
      break;
    }

    const count = bucket.end - bucket.start;
    const mid = bucket.start + Math.floor(count / 2);

    quickselect(
      bucket.start,
      bucket.end,
      mid,
      i => dataOklab[indices[i]! * 3 + bucket.maxChannel]!,
      (a, b) => {
        const tmp = indices[a]!;
        indices[a] = indices[b]!;
        indices[b] = tmp;
      }
    );

    const [leftRange, leftChannel] = computeBucketRange(dataOklab, indices, bucket.start, mid);
    const [rightRange, rightChannel] = computeBucketRange(dataOklab, indices, mid, bucket.end);

    buckets[bestIdx] = {
      start: bucket.start,
      end: mid,
      maxRange: leftRange,
      maxChannel: leftChannel,
    };
    buckets.push({start: mid, end: bucket.end, maxRange: rightRange, maxChannel: rightChannel});
  }

  return buckets;
}

function computeBucketRange(
  dataOklab: Float32Array,
  indices: Uint32Array,
  start: number,
  end: number
): [maxRange: number, maxChannel: number] {
  const minValue: [number, number, number] = [
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
  ];
  const maxValue: [number, number, number] = [
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ];

  for (let i = start; i < end; i++) {
    const o = indices[i]! * 3;
    for (let channel = 0; channel < 3; channel++) {
      const value = dataOklab[o + channel]!;
      if (value < minValue[channel]!) {
        minValue[channel] = value;
      }
      if (value > maxValue[channel]!) {
        maxValue[channel] = value;
      }
    }
  }

  let maxRange = -1;
  let maxChannel = 0;
  for (let channel = 0; channel < 3; channel++) {
    const range = maxValue[channel]! - minValue[channel]!;
    if (range > maxRange) {
      maxRange = range;
      maxChannel = channel;
    }
  }
  return [maxRange, maxChannel];
}
