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

import {
  deltaEOKr2,
  oklabToRgb,
  type OklabTuple,
  packRgb,
  rgbToOklab,
  type RgbTuple,
  writeOklabToRgb,
  writeRgbToOklab,
} from '@eugene-khyst/artistassistapp-color-mixer';

import {createNearestColorFinder} from '@/services/color/color-distance';
import {getTonalValue, TONAL_VALUES} from '@/services/color/tonal-value';
import {ditherOrdered} from '@/services/image/filter/dither';
import {quickselect} from '@/utils/quickselect';

const OVER_QUANTIZE_FACTOR = 3;
const MIN_CANDIDATES_PER_TONAL_VALUE = 4;

type QuantizationOptions =
  {groupByTonalValue: true; dither: false} | {groupByTonalValue: false; dither: boolean};

interface PaletteGroup {
  start: number;
  end: number;
  maxColors: number;
}

interface Bucket {
  start: number;
  end: number;
  maxRange: number;
  maxChannel: number;
}

interface Cluster {
  oklab: OklabTuple;
  count: number;
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
  quantizeImageColors(imageData, maxColors, transformColor, {groupByTonalValue: false, dither});
}

export function quantizeColorsByTonalValue(imageData: ImageData, maxColors: number): void {
  quantizeImageColors(imageData, maxColors, color => color, {
    groupByTonalValue: true,
    dither: false,
  });
}

function quantizeImageColors(
  imageData: ImageData,
  maxColors: number,
  transformColor: (color: OklabTuple) => OklabTuple,
  {groupByTonalValue, dither}: QuantizationOptions
): void {
  if (!Number.isInteger(maxColors) || maxColors < 1) {
    throw new RangeError('maxColors must be a positive integer');
  }
  const {data, width, height} = imageData;
  const pixelCount = Math.floor(data.length / 4);
  if (pixelCount === 0) {
    return;
  }

  const dataOklab = new Float32Array(pixelCount * 3);
  const indices = new Uint32Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    writeRgbToOklab(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!, dataOklab, i * 3);
    indices[i] = i;
  }

  const groups = groupByTonalValue
    ? createTonalValueGroups(imageData, dataOklab, indices, maxColors)
    : [{start: 0, end: pixelCount, maxColors}];

  for (const group of groups) {
    const buckets = splitBuckets(
      dataOklab,
      indices,
      group.start,
      group.end,
      group.maxColors * OVER_QUANTIZE_FACTOR
    );
    const clusters = mergeClusters(
      buildClusters(dataOklab, indices, buckets, transformColor),
      group.maxColors
    );
    const paletteByRgb = new Map<number, OklabTuple>();
    for (const {oklab} of clusters) {
      paletteByRgb.set(packRgb(...oklabToRgb(...oklab)), oklab);
    }
    const palette: OklabTuple[] = [...paletteByRgb.values()];

    if (dither && palette.length > 1) {
      ditherOrdered(dataOklab, width, height, palette);
    } else {
      const findNearestColor = createNearestColorFinder(palette);
      for (let i = group.start; i < group.end; i++) {
        const o = indices[i]! * 3;
        const nearest =
          palette[findNearestColor(dataOklab[o]!, dataOklab[o + 1]!, dataOklab[o + 2]!)]!;
        dataOklab[o] = nearest[0];
        dataOklab[o + 1] = nearest[1];
        dataOklab[o + 2] = nearest[2];
      }
    }
  }

  for (let i = 0; i < pixelCount; i++) {
    const o = i * 3;
    writeOklabToRgb(dataOklab[o]!, dataOklab[o + 1]!, dataOklab[o + 2]!, data, i * 4);
  }
}

function createTonalValueGroups(
  {data}: ImageData,
  dataOklab: Float32Array,
  indices: Uint32Array,
  maxColors: number
): PaletteGroup[] {
  const counts = TONAL_VALUES.map(() => 0);
  const colors = TONAL_VALUES.map(() => new Set<number>());
  const pixelTonalValues = new Uint8Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    const value = getTonalValue(dataOklab[i * 3]!);
    pixelTonalValues[i] = value;
    counts[value] = counts[value]! + 1;
    const groupColors = colors[value]!;
    if (groupColors.size < maxColors) {
      groupColors.add(packRgb(data[i * 4]!, data[i * 4 + 1]!, data[i * 4 + 2]!));
    }
  }

  let start = 0;
  const groups = TONAL_VALUES.map(value => {
    const group = {start, end: start + counts[value]!, maxColors: 0, capacity: colors[value]!.size};
    start = group.end;
    return group;
  });
  const populatedGroups = groups.filter(group => group.capacity > 0);
  if (maxColors < populatedGroups.length) {
    return [{start: 0, end: indices.length, maxColors}];
  }

  const offsets = groups.map(group => group.start);
  for (let i = 0; i < indices.length; i++) {
    const value = pixelTonalValues[i]!;
    indices[offsets[value]!] = i;
    offsets[value] = offsets[value]! + 1;
  }
  const minimum = Math.min(
    MIN_CANDIDATES_PER_TONAL_VALUE,
    Math.floor(maxColors / populatedGroups.length)
  );
  let remaining = maxColors;
  for (const group of populatedGroups) {
    group.maxColors = Math.min(minimum, group.capacity);
    remaining -= group.maxColors;
  }
  while (remaining > 0) {
    let bestGroup: (typeof populatedGroups)[number] | undefined;
    let bestWeight = -1;
    for (const group of populatedGroups) {
      const weight = (group.end - group.start) / (group.maxColors + 1);
      if (group.maxColors < group.capacity && weight > bestWeight) {
        bestGroup = group;
        bestWeight = weight;
      }
    }
    if (!bestGroup) {
      break;
    }
    bestGroup.maxColors++;
    remaining--;
  }
  return populatedGroups;
}

function buildClusters(
  dataOklab: Float32Array,
  indices: Uint32Array,
  buckets: Bucket[],
  transformColor: (color: OklabTuple) => OklabTuple
): Cluster[] {
  return buckets.map(({start, end}) => {
    const count = end - start;
    const center: [number, number, number] = [0, 0, 0];
    for (let i = start; i < end; i++) {
      const o = indices[i]! * 3;
      center[0] += dataOklab[o]!;
      center[1] += dataOklab[o + 1]!;
      center[2] += dataOklab[o + 2]!;
    }
    center[0] /= count;
    center[1] /= count;
    center[2] /= count;
    let nearest: OklabTuple = [Number.POSITIVE_INFINITY, 0, 0];
    let minDistance = Number.POSITIVE_INFINITY;
    for (let i = start; i < end; i++) {
      const o = indices[i]! * 3;
      const l1 = dataOklab[o]!;
      const a1 = dataOklab[o + 1]!;
      const b1 = dataOklab[o + 2]!;
      const [l2, a2, b2] = nearest;
      const distance = deltaEOKr2(l1, a1, b1, ...center);
      if (
        distance < minDistance ||
        (distance === minDistance && compareOklab({l1, a1, b1}, {l2, a2, b2}) < 0)
      ) {
        nearest = [l1, a1, b1];
        minDistance = distance;
      }
    }
    const oklab = transformColor(nearest);
    return {oklab, count};
  });
}

function compareOklab(
  {l1, a1, b1}: {l1: number; a1: number; b1: number},
  {l2, a2, b2}: {l2: number; a2: number; b2: number}
): number {
  return l1 - l2 || a1 - a2 || b1 - b2;
}

function mergeClusters(clusters: Cluster[], maxColors: number): Cluster[] {
  const count = clusters.length;
  if (count <= maxColors) {
    return clusters;
  }
  const active = clusters.map((cluster, distanceIndex) => ({cluster, distanceIndex}));
  const squaredDistances = new Float64Array(count * count);
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const distance = deltaEOKr2(...clusters[i]!.oklab, ...clusters[j]!.oklab);
      squaredDistances[i * count + j] = squaredDistances[j * count + i] = distance ** 2;
    }
  }
  while (active.length > maxColors) {
    let minError = Number.POSITIVE_INFINITY;
    let mergeI = 0;
    let mergeJ = 1;
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const left = active[i]!;
        const right = active[j]!;
        const error =
          Math.min(left.cluster.count, right.cluster.count) *
          squaredDistances[left.distanceIndex * count + right.distanceIndex]!;
        if (error < minError) {
          minError = error;
          mergeI = i;
          mergeJ = j;
        }
      }
    }

    const [keepIdx, removeIdx] =
      active[mergeI]!.cluster.count >= active[mergeJ]!.cluster.count
        ? [mergeI, mergeJ]
        : [mergeJ, mergeI];
    const keep = active[keepIdx]!.cluster;
    const remove = active[removeIdx]!.cluster;
    keep.count += remove.count;
    active.splice(removeIdx, 1);
  }
  return active.map(({cluster}) => cluster);
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
    let mid = bucket.start + Math.floor(count / 2);

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

    // Equal channel values must stay together so identical colors cannot occupy several buckets.
    const pivot = dataOklab[indices[mid]! * 3 + bucket.maxChannel]!;
    let equalStart = bucket.start;
    let equalEnd = bucket.end;
    let i = bucket.start;
    while (i < equalEnd) {
      const value = dataOklab[indices[i]! * 3 + bucket.maxChannel]!;
      if (value < pivot) {
        const tmp = indices[equalStart]!;
        indices[equalStart++] = indices[i]!;
        indices[i++] = tmp;
      } else if (value > pivot) {
        const tmp = indices[--equalEnd]!;
        indices[equalEnd] = indices[i]!;
        indices[i] = tmp;
      } else {
        i++;
      }
    }
    mid =
      equalStart > bucket.start && (equalEnd === bucket.end || mid - equalStart <= equalEnd - mid)
        ? equalStart
        : equalEnd;

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
