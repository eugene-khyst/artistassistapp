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

import {linearizeRgbChannel} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it} from 'vitest';

import type {WhiteBalanceLevels} from '@/services/image/adjust-colors';
import {adjustColorsWebGL} from '@/services/image/filter/color-adjustment-webgl';

import {createImage, type Pixel, pixelAt, readImage} from './fixtures';

const LOW: Pixel = [40, 60, 80, 255];
const MID: Pixel = [120, 130, 140, 255];
const HIGH: Pixel = [200, 180, 220, 255];

function levelsImage(): OffscreenCanvas {
  return createImage(3, 1, x => [LOW, MID, HIGH][x]!);
}

function linearize([r, g, b]: Pixel): number[] {
  return [r, g, b].map(value => linearizeRgbChannel(value));
}

describe('color adjustment white balance levels', () => {
  it.each<[string, WhiteBalanceLevels | undefined]>([
    ['the default levels', undefined],
    ['an empty range at a gray value', {minValues: linearize(MID), maxValues: linearize(MID)}],
    ['an empty range at white', {minValues: [1, 1, 1], maxValues: [1, 1, 1]}],
    ['a black white point', {maxValues: [0, 0, 0]}],
  ])('leaves the image unchanged with %s', (_name, levels) => {
    const result = readImage(adjustColorsWebGL(levelsImage(), {}, levels));

    [LOW, MID, HIGH].forEach((pixel, x) => {
      pixelAt(result, x, 0).forEach((value, channel) => {
        expect(Math.abs(value - pixel[channel]!)).toBeLessThanOrEqual(1);
      });
    });
  });

  it('leaves a channel without a range alone while it stretches the others', () => {
    const [lowRed, lowGreen] = linearize(LOW);
    const [highRed, highGreen] = linearize(HIGH);
    const flatBlue = linearizeRgbChannel(MID[2]);
    const result = readImage(
      adjustColorsWebGL(
        levelsImage(),
        {},
        {
          minValues: [lowRed!, lowGreen!, flatBlue],
          maxValues: [highRed!, highGreen!, flatBlue],
        }
      )
    );

    expect(pixelAt(result, 0, 0).slice(0, 2)).toEqual([0, 0]);
    expect(pixelAt(result, 2, 0).slice(0, 2)).toEqual([255, 255]);
    [LOW, MID, HIGH].forEach((pixel, x) => {
      expect(Math.abs(pixelAt(result, x, 0)[2] - pixel[2])).toBeLessThanOrEqual(1);
    });
  });

  it('stretches every channel from its min value to black and its max value to white', () => {
    const result = readImage(
      adjustColorsWebGL(levelsImage(), {}, {minValues: linearize(LOW), maxValues: linearize(HIGH)})
    );

    expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(result, 2, 0)).toEqual([255, 255, 255, 255]);
    pixelAt(result, 1, 0)
      .slice(0, 3)
      .forEach(value => {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(255);
      });
  });
});
