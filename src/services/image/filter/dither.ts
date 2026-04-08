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

import {BLUE_NOISE, BLUE_NOISE_SIZE} from './blue-noise';

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

  // Precompute minimum distance between palette colors for spread calculation
  let minPaletteDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const [li, ai, bi] = palette[i]!;
    for (let j = i + 1; j < n; j++) {
      const [lj, aj, bj] = palette[j]!;
      const dl = li - lj;
      const da = ai - aj;
      const db = bi - bj;
      const dist = Math.hypot(dl, da, db);
      if (dist < minPaletteDist) {
        minPaletteDist = dist;
      }
    }
  }
  const spread = minPaletteDist * 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      const threshold =
        BLUE_NOISE[(y % BLUE_NOISE_SIZE) * BLUE_NOISE_SIZE + (x % BLUE_NOISE_SIZE)]! / 255 - 0.5;

      const l = dataOklab[i]! + threshold * spread;
      const a = dataOklab[i + 1]! + threshold * spread;
      const b = dataOklab[i + 2]! + threshold * spread;

      // Find nearest palette color
      let bestDist = Number.POSITIVE_INFINITY;
      let bestIdx = 0;
      for (let p = 0; p < n; p++) {
        const [pl, pa, pb] = palette[p]!;
        const dl = l - pl;
        const da = a - pa;
        const db = b - pb;
        const dist = dl * dl + da * da + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = p;
        }
      }

      const [bl, ba, bb] = palette[bestIdx]!;
      dataOklab[i] = bl;
      dataOklab[i + 1] = ba;
      dataOklab[i + 2] = bb;
    }
  }
}
