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

import {deltaEOKr2, type OklabTuple} from '@eugene-khyst/artistassistapp-color-mixer';

export function writeOklabToDistanceCoordinates(
  l: number,
  a: number,
  b: number,
  out: Float64Array,
  offset: number
): void {
  // Distance from black reuses the mixer's lightness transform without copying its constants.
  out[offset] = Math.sign(l) * deltaEOKr2(l, 0, 0, 0, 0, 0);
  out[offset + 1] = 2 * a;
  out[offset + 2] = 2 * b;
}

export function createNearestColorFinder(
  palette: OklabTuple[]
): (l: number, a: number, b: number) => number {
  const paletteCoordinates = new Float64Array(palette.length * 3);
  for (const [i, color] of palette.entries()) {
    writeOklabToDistanceCoordinates(...color, paletteCoordinates, i * 3);
  }
  const coordinates = new Float64Array(3);
  return (l, a, b) => {
    writeOklabToDistanceCoordinates(l, a, b, coordinates, 0);
    let minDistance = Number.POSITIVE_INFINITY;
    let nearestIndex = -1;
    for (let p = 0; p < palette.length; p++) {
      const offset = p * 3;
      const dl = coordinates[0]! - paletteCoordinates[offset]!;
      const da = coordinates[1]! - paletteCoordinates[offset + 1]!;
      const db = coordinates[2]! - paletteCoordinates[offset + 2]!;
      const distance = dl * dl + da * da + db * db;
      if (distance < minDistance) {
        minDistance = distance;
        nearestIndex = p;
      }
    }
    return nearestIndex;
  };
}
