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
  clamp,
  deltaEOKr2,
  packRgb,
  rgbToOklab,
  type RgbTuple,
  unpackRgb,
} from '@eugene-khyst/artistassistapp-color-mixer';

import {getRgbTonalValue, TONAL_VALUES, type TonalValue} from '@/services/color/tonal-value';
import {type DrawImageSource, drawImageToOffscreenCanvas, getAverageColor} from '@/utils/graphics';

import {chamferDistanceTransform} from './chamfer-distance-transform';

export const SAMPLING_DIAMETER = 5;
const MIN_MIXTURES_PER_TONAL_VALUE = 2;

export interface SamplingPoint {
  rgb: RgbTuple;
  x: number;
  y: number;
  pixelCount: number;
}

export function sampleOriginalImagePixels(
  image: DrawImageSource,
  points: SamplingPoint[],
  sampledWidth: number,
  sampledHeight: number
): SamplingPoint[] {
  const {width, height} = image;
  const [, ctx] = drawImageToOffscreenCanvas(image, {
    willReadFrequently: true,
    fillStyle: '#fff',
  });
  const diameter = Math.min(SAMPLING_DIAMETER, width, height);
  const radius = Math.trunc(diameter / 2);
  return points.map(({x, y, pixelCount}) => {
    const left = clamp(
      Math.floor(((x + 0.5) * width) / sampledWidth) - radius,
      0,
      width - diameter
    );
    const top = clamp(
      Math.floor(((y + 0.5) * height) / sampledHeight) - radius,
      0,
      height - diameter
    );
    return {
      x: left + diameter / 2,
      y: top + diameter / 2,
      rgb: getAverageColor(ctx.getImageData(left, top, diameter, diameter)),
      pixelCount,
    };
  });
}

export function computeSamplingPoints(imageData: ImageData): SamplingPoint[] {
  const {data, width, height} = imageData;
  const pixelCount = width * height;

  const colorKeys = new Uint32Array(pixelCount);
  const centers = new Map<number, {x: number; y: number; count: number}>();

  for (let i = 0; i < pixelCount; i++) {
    const di = i << 2;
    const key = packRgb(data[di]!, data[di + 1]!, data[di + 2]!);
    colorKeys[i] = key;
    const center = centers.get(key) ?? {x: 0, y: 0, count: 0};
    center.x += i % width;
    center.y += Math.floor(i / width);
    center.count++;
    centers.set(key, center);
  }
  for (const center of centers.values()) {
    center.x /= center.count;
    center.y /= center.count;
  }

  const dist = chamferDistanceTransform(colorKeys, width, height);

  const bestPixels = new Map<
    number,
    {x: number; y: number; dist: number; centerDistance: number}
  >();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const key = colorKeys[i]!;
      const d = dist[i]!;
      const center = centers.get(key)!;
      const centerDistance = (x - center.x) ** 2 + (y - center.y) ** 2;
      const best = bestPixels.get(key);
      if (!best || d > best.dist || (d === best.dist && centerDistance < best.centerDistance)) {
        bestPixels.set(key, {
          x,
          y,
          dist: d,
          centerDistance,
        });
      }
    }
  }

  const result: SamplingPoint[] = [];
  for (const [key, {x, y}] of bestPixels) {
    result.push({
      rgb: unpackRgb(key),
      x,
      y,
      pixelCount: centers.get(key)!.count,
    });
  }

  return result;
}

export function selectSamplingPoints<T extends SamplingPoint>(
  points: T[],
  maxColors: number,
  getPaletteRgb: (point: T) => RgbTuple = point => point.rgb
): T[] {
  const paintColors = new Map<number, T>();
  for (const point of points) {
    const key = packRgb(...getPaletteRgb(point));
    const existing = paintColors.get(key);
    if (!existing || point.pixelCount > existing.pixelCount) {
      paintColors.set(key, point);
    }
  }
  const candidates = [...paintColors.values()];
  const candidateTonalValues = candidates.map(point => getRgbTonalValue(getPaletteRgb(point)));
  const reservations = TONAL_VALUES.map(tonalValue => ({
    tonalValue,
    count: candidateTonalValues.filter(value => value === tonalValue).length,
  })).filter(({count}) => count > 0);
  const targets = points.map(point => ({
    pixelCount: point.pixelCount,
    oklab: rgbToOklab(...point.rgb),
    tonalValue: getRgbTonalValue(getPaletteRgb(point)),
  }));
  const count = candidates.length;
  const targetCount = targets.length;
  const squaredDistances = new Float64Array(count * targetCount);
  for (const [i, point] of candidates.entries()) {
    const color = rgbToOklab(...getPaletteRgb(point));
    for (let j = 0; j < targetCount; j++) {
      const distance = deltaEOKr2(...color, ...targets[j]!.oklab);
      squaredDistances[i * targetCount + j] = distance ** 2;
    }
  }

  const selected = new Uint8Array(count);
  const selectedTonalValues = new Set<TonalValue>();
  const nearestSquaredDistances = new Float64Array(targetCount).fill(Number.POSITIVE_INFINITY);
  const result: T[] = [];
  const selectNext = (tonalValue?: TonalValue): boolean => {
    let bestIndex = -1;
    let minError = Number.POSITIVE_INFINITY;
    for (let i = 0; i < count; i++) {
      if (
        selected[i] ||
        (tonalValue !== undefined && candidateTonalValues[i] !== tonalValue) ||
        (maxColors < reservations.length && selectedTonalValues.has(candidateTonalValues[i]!))
      ) {
        continue;
      }
      let error = 0;
      for (let j = 0; j < targetCount; j++) {
        if (tonalValue !== undefined && targets[j]!.tonalValue !== tonalValue) {
          continue;
        }
        error +=
          targets[j]!.pixelCount *
          Math.min(nearestSquaredDistances[j]!, squaredDistances[i * targetCount + j]!);
      }
      if (error < minError) {
        minError = error;
        bestIndex = i;
      }
    }
    if (bestIndex < 0) {
      return false;
    }
    selected[bestIndex] = 1;
    selectedTonalValues.add(candidateTonalValues[bestIndex]!);
    result.push(candidates[bestIndex]!);
    for (let i = 0; i < targetCount; i++) {
      nearestSquaredDistances[i] = Math.min(
        nearestSquaredDistances[i]!,
        squaredDistances[bestIndex * targetCount + i]!
      );
    }
    return true;
  };

  const minimum = Math.min(
    MIN_MIXTURES_PER_TONAL_VALUE,
    Math.floor(maxColors / reservations.length)
  );
  for (const {tonalValue, count} of reservations) {
    for (let i = 0; i < Math.min(minimum, count); i++) {
      selectNext(tonalValue);
    }
  }
  while (result.length < maxColors) {
    if (!selectNext()) {
      break;
    }
  }
  return result;
}
