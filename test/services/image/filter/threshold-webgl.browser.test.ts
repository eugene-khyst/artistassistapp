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

import grayscaleFragmentShaderSource from '@/services/image/filter/glsl/grayscale-oklab-lightness.glsl';
import {thresholdFilterWebGL} from '@/services/image/filter/threshold-webgl';
import {WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '@/utils/graphics';

import {createImage, pixelAt, readImage} from './fixtures';

const SIZE = 16;

describe('threshold passes', () => {
  it('stores Oklab lightness in red with zero green and blue', () => {
    const source = createImage(3, 1, x => {
      if (x === 0) {
        return [0, 0, 0, 255];
      }
      return x === 1 ? [0, 255, 0, 255] : [255, 255, 255, 255];
    });
    const renderer = new WebGLRenderer([grayscaleFragmentShaderSource], [[]], source);
    try {
      renderer.render();
      const result = readImage(copyOffscreenCanvas(renderer.canvas));

      expect(pixelAt(result, 0, 0)).toEqual([0, 0, 0, 255]);
      expect(pixelAt(result, 2, 0)).toEqual([255, 0, 0, 255]);
      const [r, g, b, alpha] = pixelAt(result, 1, 0);
      expect(r).toBeGreaterThan(200);
      expect(r).toBeLessThan(255);
      expect([g, b, alpha]).toEqual([0, 0, 255]);
    } finally {
      renderer.cleanUp();
    }
  });

  it('thresholds supplied grayscale from red without converting it again', () => {
    const source = createImage(SIZE, SIZE, x =>
      x < SIZE / 2 ? [64, 255, 255, 255] : [192, 0, 0, 255]
    );

    const result = readImage(thresholdFilterWebGL(source, [0.5], [0], {grayscaleInput: true})[0]!);

    expect(pixelAt(result, 2, 2)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(result, SIZE - 3, 2)).toEqual([255, 255, 255, 255]);
  });

  it('smooths a checkerboard in lightness space before thresholding', () => {
    const source = createImage(SIZE, SIZE, (x, y) =>
      (x + y) % 2 ? [255, 255, 255, 255] : [0, 0, 0, 255]
    );

    const result = readImage(
      thresholdFilterWebGL(source, [0.56], [0], {gaussianBlurKernelSize: 3})[0]!
    );

    for (let y = 2; y < SIZE - 2; y++) {
      for (let x = 2; x < SIZE - 2; x++) {
        expect(pixelAt(result, x, y)).toEqual([0, 0, 0, 255]);
      }
    }
  });

  it.each(['horizontal', 'vertical'] as const)(
    'suppresses alternating %s grayscale detail',
    direction => {
      const source = createImage(SIZE, SIZE, (x, y) => {
        const value = (direction === 'horizontal' ? x : y) % 2 ? 180 : 140;
        return [value, 0, 0, 255];
      });

      const result = readImage(
        thresholdFilterWebGL(source, [0.6], [0], {
          grayscaleInput: true,
          gaussianBlurKernelSize: 3,
        })[0]!
      );

      for (let y = 2; y < SIZE - 2; y++) {
        for (let x = 2; x < SIZE - 2; x++) {
          expect(pixelAt(result, x, y)).toEqual([255, 255, 255, 255]);
        }
      }
    }
  );

  it('preserves broad light and shadow regions and their orientation', () => {
    const source = createImage(SIZE, SIZE, (_x, y) =>
      y < SIZE / 2 ? [0, 0, 0, 255] : [255, 255, 255, 255]
    );

    const results = thresholdFilterWebGL(source, [0.825, 0.6, 0.35], [2 / 3, 1 / 3, 0], {
      gaussianBlurKernelSize: 3,
    });

    for (const [i, result] of results.entries()) {
      const data = readImage(result);
      const dark = [170, 85, 0][i]!;
      expect(pixelAt(data, 2, 2)).toEqual([dark, dark, dark, 255]);
      expect(pixelAt(data, 2, SIZE - 3)).toEqual([255, 255, 255, 255]);
    }
  });
});
