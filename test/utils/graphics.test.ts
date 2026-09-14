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

import type {Fraction} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it} from 'vitest';

import {aspectRatioSize, rotatedImageCropSize} from '@/utils/graphics';

const ASPECT_RATIOS: Fraction[] = [
  [16, 9],
  [9, 16],
  [4, 3],
  [3, 4],
  [1, 1],
  [21, 9],
  [1.91, 1],
];

describe('rotatedImageCropSize', () => {
  it('keeps the size when the angle is zero', () => {
    expect(rotatedImageCropSize(400, 300, 0)).toEqual({width: 400, height: 300});
  });

  it('crops a square rotated by 45 degrees to its inscribed square', () => {
    expect(rotatedImageCropSize(100, 100, 45)).toEqual({width: 70, height: 70});
    expect(rotatedImageCropSize(100, 100, -45)).toEqual({width: 70, height: 70});
  });

  it('keeps the aspect ratio and every corner inside the rotated image', () => {
    const [width, height] = [400, 300];
    for (let angle = -45; angle <= 45; angle += 0.5) {
      const size = rotatedImageCropSize(width, height, angle);
      expect(Math.abs(size.width / size.height - width / height)).toBeLessThan(0.01);
      const radians = (angle * Math.PI) / 180;
      for (const [sx, sy] of [
        [1, 1],
        [1, -1],
      ] as const) {
        const x = (sx * size.width) / 2;
        const y = (sy * size.height) / 2;
        const u = x * Math.cos(radians) + y * Math.sin(radians);
        const v = -x * Math.sin(radians) + y * Math.cos(radians);
        expect(Math.abs(u)).toBeLessThanOrEqual(width / 2 + 1e-9);
        expect(Math.abs(v)).toBeLessThanOrEqual(height / 2 + 1e-9);
      }
    }
  });
});

describe('aspectRatioSize', () => {
  it('keeps the size when no aspect ratio is given', () => {
    expect(aspectRatioSize(180, 100)).toEqual({width: 180, height: 100});
  });

  it('grows the axis that is short of the aspect ratio', () => {
    expect(aspectRatioSize(180, 100, [16, 9])).toEqual({width: 180, height: 102});
    expect(aspectRatioSize(100, 180, [9, 16])).toEqual({width: 102, height: 180});
  });

  it('settles after one expansion, so expanding again adds nothing', () => {
    for (const aspectRatio of ASPECT_RATIOS) {
      for (let width = 50; width <= 400; width += 7) {
        for (let height = 50; height <= 400; height += 11) {
          const size = aspectRatioSize(width, height, aspectRatio);
          expect(aspectRatioSize(size.width, size.height, aspectRatio)).toEqual(size);
        }
      }
    }
  });
});
