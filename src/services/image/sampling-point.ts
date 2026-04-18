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

import {deltaEOk, rgbToOklab} from '~/src/services/color/space/oklab';
import type {RgbTuple} from '~/src/services/color/space/rgb';
import {packRgb, unpackRgb} from '~/src/services/color/space/rgb';
import {byNumber, reverseOrder} from '~/src/utils/comparator';

const MERGE_DELTA_E_OK = 0.05;

export interface SamplingPoint {
  rgb: RgbTuple;
  x: number;
  y: number;
}

/**
 * For each color in a quantized image, find the pixel deepest inside the
 * thickest region of that color (Chamfer 3-4 distance transform).
 */
export function computeSamplingPoints(imageData: ImageData): SamplingPoint[] {
  const {data, width, height} = imageData;
  const pixelCount = width * height;

  const colorKeys = new Uint32Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const di = i << 2;
    colorKeys[i] = packRgb(data[di]!, data[di + 1]!, data[di + 2]!);
  }

  // Distance field: boundary pixels → 0, all others → INF (not yet measured).
  const dist = new Uint16Array(pixelCount);
  const INF = 0xffff;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        dist[i] = 0;
        continue;
      }
      const key = colorKeys[i]!;
      if (
        colorKeys[i - width] !== key ||
        colorKeys[i + width] !== key ||
        colorKeys[i - 1] !== key ||
        colorKeys[i + 1] !== key
      ) {
        dist[i] = 0;
      } else {
        dist[i] = INF;
      }
    }
  }

  // Forward pass: weights 3 (orthogonal) / 4 (diagonal)
  for (let y = 1; y <= height - 2; y++) {
    for (let x = 1; x <= width - 2; x++) {
      const i = y * width + x;
      if (dist[i] === 0) {
        continue;
      }
      const d = Math.min(
        dist[i - width - 1]! + 4,
        dist[i - width]! + 3,
        dist[i - width + 1]! + 4,
        dist[i - 1]! + 3
      );
      if (d < dist[i]!) {
        dist[i] = d;
      }
    }
  }

  // Backward pass
  for (let y = height - 2; y >= 1; y--) {
    for (let x = width - 2; x >= 1; x--) {
      const i = y * width + x;
      if (dist[i] === 0) {
        continue;
      }
      const d = Math.min(
        dist[i + width + 1]! + 4,
        dist[i + width]! + 3,
        dist[i + width - 1]! + 4,
        dist[i + 1]! + 3
      );
      if (d < dist[i]!) {
        dist[i] = d;
      }
    }
  }

  // Per-color maximum distance → sampling point
  const bestPixels = new Map<number, {x: number; y: number; dist: number}>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const key = colorKeys[i]!;
      const d = dist[i]!;
      const best = bestPixels.get(key);
      if (!best || d > best.dist) {
        bestPixels.set(key, {
          x,
          y,
          dist: d,
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
    });
  }

  return result;
}

export function mergeSimilarSamplingPoints<T extends SamplingPoint>(
  points: T[],
  threshold = MERGE_DELTA_E_OK
): T[] {
  if (points.length <= 1) {
    return points;
  }

  const pointsWithOklab = points.map(p => {
    const [l, a, b] = rgbToOklab(...p.rgb);
    return {
      point: p,
      l,
      a,
      b,
      chroma: Math.hypot(a, b),
    };
  });

  pointsWithOklab.sort(reverseOrder(byNumber(({chroma}) => chroma)));

  const result: typeof pointsWithOklab = [];

  for (const point of pointsWithOklab) {
    const isSimilar: boolean = result.some(
      ({l, a, b}) => deltaEOk(point.l, point.a, point.b, l, a, b) <= threshold
    );
    if (!isSimilar) {
      result.push(point);
    }
  }

  return result.map(({point}) => point);
}
