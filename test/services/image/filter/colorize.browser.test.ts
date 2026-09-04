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

import {colorizeWebGL, type LabChannels} from '@/services/image/filter/colorize-webgl';

import {createImage, type Pixel, pixelAt, readImage} from './fixtures';

const WIDTH = 8;
const HEIGHT = 8;

/** The model predicts a and b at its own, lower resolution, so the shader resamples them. */
const PLANE = 4;

function grayImage(gray: number): OffscreenCanvas {
  return createImage(WIDTH, HEIGHT, () => [gray, gray, gray, 255]);
}

function flatChannels(a: number, b: number): LabChannels {
  return {
    a: new Float32Array(PLANE * PLANE).fill(a),
    b: new Float32Array(PLANE * PLANE).fill(b),
    width: PLANE,
    height: PLANE,
  };
}

/** A flat input has to give a flat output, so every pixel is checked, not just one. */
function colorize(gray: number, a: number, b: number): Pixel {
  const image = readImage(colorizeWebGL(grayImage(gray), flatChannels(a, b)));
  const center = pixelAt(image, WIDTH / 2, HEIGHT / 2);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      expect(pixelAt(image, x, y), `pixel ${x}, ${y}`).toEqual(center);
    }
  }
  return center;
}

describe('colorize shader', () => {
  /** Lab with no chroma is the input gray again, whatever the lightness is. */
  it.each([0, 32, 128, 200, 255])(
    'leaves gray %d alone when the predicted chroma is zero',
    gray => {
      expect(colorize(gray, 0, 0)).toEqual([gray, gray, gray, 255]);
    }
  );

  it.each([
    [128, 20, -30, [136, 118, 180]],
    [200, -25, 40, [179, 211, 123]],
    [96, 35, 15, [153, 70, 73]],
  ])('takes the lightness from gray %d and the color from a %d, b %d', (gray, a, b, expected) => {
    const [r, g, blue, alpha] = colorize(gray, a, b);

    expect([r, g, blue]).toEqual(expected);
    expect(alpha).toBe(255);
  });

  /** Clipping each channel would keep the lightness but swing the hue. */
  it.each([
    [128, 90, -90, [181, 71, 255], [188, 39, 255]],
    [64, 100, 60, [150, 0, 28], [188, 0, 0]],
  ])(
    'gamut maps gray %d with a %d, b %d rather than clipping its channels',
    (gray, a, b, mapped, clipped) => {
      const [r, g, blue] = colorize(gray, a, b);

      expect([r, g, blue]).toEqual(mapped);
      expect([r, g, blue]).not.toEqual(clipped);
    }
  );
});
