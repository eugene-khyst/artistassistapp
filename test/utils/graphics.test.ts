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

import {aspectRatioSize} from '@/utils/graphics';

const ASPECT_RATIOS: Fraction[] = [
  [16, 9],
  [9, 16],
  [4, 3],
  [3, 4],
  [1, 1],
  [21, 9],
  [1.91, 1],
];

describe('aspectRatioSize', () => {
  it('keeps the size when no aspect ratio is given', () => {
    expect(aspectRatioSize(180, 100)).toEqual([180, 100]);
  });

  it('grows the axis that is short of the aspect ratio', () => {
    expect(aspectRatioSize(180, 100, [16, 9])).toEqual([180, 102]);
    expect(aspectRatioSize(100, 180, [9, 16])).toEqual([102, 180]);
  });

  it('settles after one expansion, so expanding again adds nothing', () => {
    for (const aspectRatio of ASPECT_RATIOS) {
      for (let width = 50; width <= 400; width += 7) {
        for (let height = 50; height <= 400; height += 11) {
          const size = aspectRatioSize(width, height, aspectRatio);
          expect(aspectRatioSize(...size, aspectRatio)).toEqual(size);
        }
      }
    }
  });
});
