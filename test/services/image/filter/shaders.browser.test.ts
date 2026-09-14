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

import {adjustColorsWebGL} from '@/services/image/filter/color-adjustment-webgl';
import {colorMapFilterWebGL} from '@/services/image/filter/color-map-webgl';
import {colorMatchFilterWebGL} from '@/services/image/filter/color-match-webgl';
import {dilationWebGL} from '@/services/image/filter/dilation-webgl';
import {gaussianBlurWebGL} from '@/services/image/filter/gaussian-blur-webgl';
import {highPassWebGL} from '@/services/image/filter/high-pass-webgl';
import {interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {invertColorsWebGL} from '@/services/image/filter/invert-colors-webgl';
import {kuwaharaFilterWebGL} from '@/services/image/filter/kuwahara-filter-webgl';
import {multiLayerRadialMaskWebGL} from '@/services/image/filter/multi-layer-radial-mask-webgl';
import {correctPerspectiveWebGL} from '@/services/image/filter/perspective-correction-webgl';
import {sobelEdgeDetectionWebGL} from '@/services/image/filter/sobel-edge-detection-webgl';
import {sobelGradientsXyWebGL} from '@/services/image/filter/sobel-gradients-xy-webgl';
import {thresholdFilterWebGL} from '@/services/image/filter/threshold-webgl';
import {Interpolation} from '@/services/image/filter/types';
import {unsharpMaskWebGL} from '@/services/image/filter/unsharp-mask-webgl';
import {Vector} from '@/services/math/geometry';
import {IMAGE_SIZE} from '@/utils/graphics';

import {createImage, pixelAt, readImage} from './fixtures';

const WIDTH = 24;
const HEIGHT = 16;

function testImage(): OffscreenCanvas {
  return createImage(WIDTH, HEIGHT, (x, y) => [
    Math.round((x * 255) / (WIDTH - 1)),
    Math.round((y * 255) / (HEIGHT - 1)),
    (x + y) % 2 ? 40 : 210,
    255,
  ]);
}

// Every shader has to compile, link and write something; the size-preserving ones keep the size.
const SIZE_PRESERVING: [name: string, render: () => OffscreenCanvas][] = [
  [
    'linear-interpolation',
    () => interpolationWebGL(testImage(), WIDTH, HEIGHT, Interpolation.Linear),
  ],
  [
    'bilinear-interpolation',
    () => interpolationWebGL(testImage(), WIDTH, HEIGHT, Interpolation.Bilinear),
  ],
  [
    'color-adjustment',
    () => adjustColorsWebGL(testImage(), {saturation: 1.4, gamma: 1.2, inputLow: 0.05}),
  ],
  ['color-map', () => colorMapFilterWebGL(testImage())[0]],
  ['color-match', () => colorMatchFilterWebGL(testImage(), [128, 128, 128], 0.5)],
  ['threshold', () => thresholdFilterWebGL(testImage(), [0.6], [0.5])[0]!],
  ['invert-colors', () => invertColorsWebGL(testImage())],
  ['kuwahara-filter', () => kuwaharaFilterWebGL(testImage(), [4])[0]!],
  ['sobel-operator', () => sobelEdgeDetectionWebGL(testImage())],
  ['gaussian-blur', () => gaussianBlurWebGL(testImage(), 5)],
  ['high-pass', () => highPassWebGL(testImage(), 25, 4, 1)],
  ['unsharp-mask', () => unsharpMaskWebGL(testImage(), 21, 3, 0.5, 0)],
  ['dilation', () => dilationWebGL(testImage(), 3)],
  [
    'multi-layer-radial-mask',
    () =>
      multiLayerRadialMaskWebGL(
        [testImage(), invertColorsWebGL(testImage()), testImage()],
        [0.3, 0.6, 1],
        new Vector(WIDTH / 3, HEIGHT / 3)
      ),
  ],
];

describe('WebGL filters', () => {
  it.each(SIZE_PRESERVING)('renders %s', (_name, render) => {
    const result = render();

    expect([result.width, result.height]).toEqual([WIDTH, HEIGHT]);
    expect(readImage(result).data.some(value => value !== 0)).toBe(true);
  });

  it('renders perspective-correction into the corrected quad', () => {
    const result = correctPerspectiveWebGL(testImage(), [
      new Vector(1, 1),
      new Vector(WIDTH - 2, 3),
      new Vector(WIDTH - 3, HEIGHT - 2),
      new Vector(2, HEIGHT - 3),
    ]);

    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(readImage(result).data.some(value => value !== 0)).toBe(true);
  });

  it('renders sobel-gradients-xy into both gradient planes', () => {
    const {gradientX, gradientY, width, height} = sobelGradientsXyWebGL(testImage());

    expect([width, height]).toEqual([WIDTH, HEIGHT]);
    expect(gradientX.some(value => value !== 0)).toBe(true);
    expect(gradientY.some(value => value !== 0)).toBe(true);
  });

  /** The overlay modes tint thin strokes with this, so it renders straight into a smaller target. */
  it('renders invert-colors into a pixel-capped target without a resize pass', () => {
    const width = 800;
    const height = 600;
    const flatRed = createImage(width, height, () => [255, 0, 0, 255]);

    const capped = invertColorsWebGL(flatRed, IMAGE_SIZE.SD);

    expect(capped.width * capped.height).toBeLessThanOrEqual(IMAGE_SIZE.SD);
    expect(capped.width / capped.height).toBeCloseTo(width / height, 2);
    expect(pixelAt(readImage(capped), capped.width >> 1, capped.height >> 1)).toEqual([
      0, 255, 255, 255,
    ]);
  });

  it('leaves invert-colors at full size when no cap is given', () => {
    const result = invertColorsWebGL(createImage(WIDTH, HEIGHT, () => [255, 0, 0, 255]));

    expect([result.width, result.height]).toEqual([WIDTH, HEIGHT]);
  });

  it('leaves a flat color unchanged when sharpening', () => {
    const image = createImage(WIDTH, HEIGHT, () => [72, 128, 204, 255]);

    const result = unsharpMaskWebGL(image, 21, 3, 0.5, 0);

    expect(pixelAt(readImage(result), WIDTH >> 1, HEIGHT >> 1)).toEqual([72, 128, 204, 255]);
  });

  it('increases contrast across an edge when sharpening', () => {
    const image = createImage(WIDTH, HEIGHT, x =>
      x < WIDTH / 2 ? [80, 80, 80, 255] : [175, 175, 175, 255]
    );

    const result = readImage(unsharpMaskWebGL(image, 21, 3, 0.5, 0));

    expect(pixelAt(result, WIDTH / 2 - 1, HEIGHT >> 1)[0]).toBeLessThan(80);
    expect(pixelAt(result, WIDTH / 2, HEIGHT >> 1)[0]).toBeGreaterThan(175);
  });

  it('preserves color and alpha across a transparent edge when sharpening', () => {
    const color = [180, 90, 60] as const;
    const alphas = [255, 255, 255, 255, 255, 255, 192, 128, 64, 0, 0, 0];
    const image = createImage(alphas.length, 1, x => [...color, alphas[x]!] as const);

    const result = readImage(unsharpMaskWebGL(image, 21, 3, 0.5, 0));

    for (let x = 5; x <= 8; x++) {
      const pixel = pixelAt(result, x, 0);
      expect(pixel[3]).toBe(alphas[x]);
      for (let channel = 0; channel < 3; channel++) {
        expect(Math.abs(pixel[channel]! - color[channel]!)).toBeLessThanOrEqual(2);
      }
    }
  });

  it('leaves a flat color unchanged when sharpening with high pass', () => {
    const image = createImage(WIDTH, HEIGHT, () => [72, 128, 204, 255]);

    const result = highPassWebGL(image, 25, 4, 1);

    expect(pixelAt(readImage(result), WIDTH >> 1, HEIGHT >> 1)).toEqual([72, 128, 204, 255]);
  });

  it('increases contrast across an edge when sharpening with high pass', () => {
    const image = createImage(WIDTH, HEIGHT, x =>
      x < WIDTH / 2 ? [80, 80, 80, 255] : [175, 175, 175, 255]
    );

    const result = readImage(highPassWebGL(image, 25, 4, 1));

    const darkSide = pixelAt(result, WIDTH / 2 - 1, HEIGHT >> 1)[0];
    const lightSide = pixelAt(result, WIDTH / 2, HEIGHT >> 1)[0];
    expect(darkSide).toBeLessThan(80);
    expect(darkSide).toBeGreaterThan(60);
    expect(lightSide).toBeGreaterThan(175);
    expect(lightSide).toBeLessThan(195);
  });

  it('preserves color and alpha across a transparent edge when sharpening with high pass', () => {
    const color = [180, 90, 60] as const;
    const alphas = [255, 255, 255, 255, 255, 255, 192, 128, 64, 0, 0, 0];
    const image = createImage(alphas.length, 1, x => [...color, alphas[x]!] as const);

    const result = readImage(highPassWebGL(image, 25, 4, 1));

    for (let x = 5; x <= 8; x++) {
      const pixel = pixelAt(result, x, 0);
      expect(pixel[3]).toBe(alphas[x]);
      for (let channel = 0; channel < 3; channel++) {
        expect(Math.abs(pixel[channel]! - color[channel]!)).toBeLessThanOrEqual(6);
      }
    }
  });
});
