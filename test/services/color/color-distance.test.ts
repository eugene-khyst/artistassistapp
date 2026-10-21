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

import {deltaEOKr2, type OklabTuple, rgbToOklab} from '@eugene-khyst/artistassistapp-color-mixer';
import {expect, it} from 'vitest';

import {
  createNearestColorFinder,
  writeOklabToDistanceCoordinates,
} from '@/services/color/color-distance';

it('preserves the mixer distance across dark, neutral and saturated colors', () => {
  const colors: OklabTuple[] = [
    ...[0, 1, 10, 64, 128, 254, 255].map(value => rgbToOklab(value, value, value)),
    rgbToOklab(255, 0, 0),
    rgbToOklab(0, 255, 0),
    rgbToOklab(0, 0, 255),
    [-0.1, 0.05, -0.05],
  ];
  const coordinates = new Float64Array(colors.length * 3);
  for (const [i, color] of colors.entries()) {
    writeOklabToDistanceCoordinates(...color, coordinates, i * 3);
  }

  for (const [i, left] of colors.entries()) {
    for (const [j, right] of colors.entries()) {
      const squaredDistance =
        (coordinates[i * 3]! - coordinates[j * 3]!) ** 2 +
        (coordinates[i * 3 + 1]! - coordinates[j * 3 + 1]!) ** 2 +
        (coordinates[i * 3 + 2]! - coordinates[j * 3 + 2]!) ** 2;
      expect(squaredDistance).toBeCloseTo(deltaEOKr2(...left, ...right) ** 2, 12);
    }
  }
});

it('finds the palette color with the smallest mixer distance', () => {
  const palette: OklabTuple[] = [
    rgbToOklab(0, 0, 0),
    rgbToOklab(128, 128, 128),
    rgbToOklab(255, 0, 0),
  ];
  const findNearestColor = createNearestColorFinder(palette);

  expect(findNearestColor(...rgbToOklab(10, 10, 10))).toBe(0);
  expect(findNearestColor(...rgbToOklab(140, 120, 130))).toBe(1);
  expect(findNearestColor(...rgbToOklab(230, 30, 20))).toBe(2);
});
