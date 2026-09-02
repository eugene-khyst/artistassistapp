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

import {describe, expect, it} from 'vitest';

import {interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {Interpolation} from '@/services/image/filter/types';

import {createImage, pixelAt, readImage} from './fixtures';

function channelMean({data}: ImageData, channel: number): number {
  let sum = 0;
  for (let i = channel; i < data.length; i += 4) {
    sum += data[i]!;
  }
  return sum / (data.length / 4);
}

describe('Lanczos interpolation', () => {
  it('leaves an image untouched when the size does not change', () => {
    const source = createImage(23, 17, (x, y) => [
      (11 * x) % 256,
      (29 * y) % 256,
      (7 * x * y) % 256,
      255,
    ]);

    const result = interpolationWebGL(source, 23, 17, Interpolation.Lanczos);

    expect(readImage(result).data).toEqual(readImage(source).data);
  });

  it('keeps a flat color exactly, so truncated edge weights renormalize', () => {
    const flat = createImage(20, 20, () => [90, 140, 200, 255]);

    const {data} = readImage(interpolationWebGL(flat, 7, 7, Interpolation.Lanczos));

    for (let i = 0; i < data.length; i += 4) {
      expect([data[i], data[i + 1], data[i + 2], data[i + 3]]).toEqual([90, 140, 200, 255]);
    }
  });

  it('keeps a mirrored image mirrored, so samples stay centered on pixel centers', () => {
    const width = 64;
    const source = createImage(width, 8, (x, y) => {
      const value = Math.min(x, width - 1 - x) * 8;
      return [value, 255 - value, (y * 30) % 256, 255];
    });

    const result = readImage(interpolationWebGL(source, 10, 8, Interpolation.Lanczos));

    for (let y = 0; y < result.height; y++) {
      for (let x = 0; x < result.width / 2; x++) {
        expect(pixelAt(result, x, y)).toEqual(pixelAt(result, result.width - 1 - x, y));
      }
    }
  });

  it('suppresses detail below the target resolution instead of aliasing it', () => {
    const stripes = createImage(64, 64, x => (x % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255]));

    const {data} = readImage(interpolationWebGL(stripes, 7, 7, Interpolation.Lanczos));

    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBeGreaterThan(115);
      expect(data[i]).toBeLessThan(140);
    }
  });

  it('preserves the average level when minifying', () => {
    const source = createImage(96, 72, (x, y) => [
      Math.round(127.5 * (1 + Math.sin(x / 4))),
      (3 * x + 5 * y) % 256,
      x < 48 ? 30 : 220,
      255,
    ]);

    const result = readImage(interpolationWebGL(source, 13, 11, Interpolation.Lanczos));

    const expected = readImage(source);
    for (const channel of [0, 1, 2]) {
      expect(channelMean(result, channel)).toBeCloseTo(channelMean(expected, channel), -0.5);
    }
  });
});
