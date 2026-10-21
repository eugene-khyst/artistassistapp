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

import {type OklabTuple, writeOklabToLinearRgb} from '@eugene-khyst/artistassistapp-color-mixer';

import {createNearestColorFinder} from '@/services/color/color-distance';

import {BLUE_NOISE, BLUE_NOISE_SIZE} from './blue-noise';

const DITHER_THRESHOLDS = rankThresholds();
const MIXTURE_ERROR_TOLERANCE = 16 * Number.EPSILON;

export function ditherOrdered(
  dataOklab: Float32Array,
  width: number,
  height: number,
  palette: OklabTuple[]
): void {
  const n = palette.length;
  if (n <= 1) {
    return;
  }

  const paletteLinearRgb = palette.map(color => {
    const rgb: [number, number, number] = [0, 0, 0];
    writeOklabToLinearRgb(...color, rgb, 0);
    return rgb;
  });
  const findNearestColor = createNearestColorFinder(palette);
  const squaredDistances = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const left = paletteLinearRgb[i]!;
      const right = paletteLinearRgb[j]!;
      squaredDistances[i * n + j] = squaredDistances[j * n + i] =
        (left[0] - right[0]) ** 2 + (left[1] - right[1]) ** 2 + (left[2] - right[2]) ** 2;
    }
  }

  const pixelLinearRgb = new Float64Array(3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const bestIdx = findNearestColor(dataOklab[i]!, dataOklab[i + 1]!, dataOklab[i + 2]!);

      writeOklabToLinearRgb(dataOklab[i]!, dataOklab[i + 1]!, dataOklab[i + 2]!, pixelLinearRgb, 0);
      const first = paletteLinearRgb[bestIdx]!;
      let minMixtureError =
        (pixelLinearRgb[0]! - first[0]) ** 2 +
        (pixelLinearRgb[1]! - first[1]) ** 2 +
        (pixelLinearRgb[2]! - first[2]) ** 2;
      let minVariance = 0;
      let partnerIndex = -1;
      let fraction = 0;
      for (let p = 0; p < n; p++) {
        const pairDistanceSquared = squaredDistances[bestIdx * n + p]!;
        if (pairDistanceSquared === 0) {
          continue;
        }
        const second = paletteLinearRgb[p]!;
        // Pixel coverage averages light, so evaluate the achievable mixture in linear RGB.
        const candidateFraction = linearRgbMixFraction(
          pixelLinearRgb,
          first,
          second,
          pairDistanceSquared
        );
        const dr = pixelLinearRgb[0]! - (first[0] + candidateFraction * (second[0] - first[0]));
        const dg = pixelLinearRgb[1]! - (first[1] + candidateFraction * (second[1] - first[1]));
        const db = pixelLinearRgb[2]! - (first[2] + candidateFraction * (second[2] - first[2]));
        const error = dr * dr + dg * dg + db * db;
        const variance = candidateFraction * (1 - candidateFraction) * pairDistanceSquared;
        if (
          error < minMixtureError - MIXTURE_ERROR_TOLERANCE ||
          (Math.abs(error - minMixtureError) <= MIXTURE_ERROR_TOLERANCE && variance < minVariance)
        ) {
          minMixtureError = error;
          minVariance = variance;
          partnerIndex = p;
          fraction = candidateFraction;
        }
      }
      let selectedIdx = bestIdx;
      if (partnerIndex >= 0) {
        const threshold =
          DITHER_THRESHOLDS[(y % BLUE_NOISE_SIZE) * BLUE_NOISE_SIZE + (x % BLUE_NOISE_SIZE)]!;
        if (threshold < fraction) {
          selectedIdx = partnerIndex;
        }
      }
      const [bl, ba, bb] = palette[selectedIdx]!;
      dataOklab[i] = bl;
      dataOklab[i + 1] = ba;
      dataOklab[i + 2] = bb;
    }
  }
}

function rankThresholds(): Float64Array {
  const order = Array.from({length: BLUE_NOISE.length}, (_, i) => i);
  // Spread tied noise values across the tile instead of assigning thresholds in row order.
  order.sort(
    (a, b) =>
      BLUE_NOISE[a]! - BLUE_NOISE[b]! ||
      (Math.imul(a, 0x9e3779b1) >>> 0) - (Math.imul(b, 0x9e3779b1) >>> 0)
  );
  const thresholds = new Float64Array(order.length);
  for (const [rank, index] of order.entries()) {
    thresholds[index] = (rank + 0.5) / order.length;
  }
  return thresholds;
}

function linearRgbMixFraction(
  pixel: Float64Array,
  first: readonly [number, number, number],
  second: readonly [number, number, number],
  pairDistanceSquared: number
): number {
  const dr = second[0] - first[0];
  const dg = second[1] - first[1];
  const db = second[2] - first[2];
  const projection =
    ((pixel[0]! - first[0]) * dr + (pixel[1]! - first[1]) * dg + (pixel[2]! - first[2]) * db) /
    pairDistanceSquared;
  return Math.max(0, Math.min(1, projection));
}
