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
import {interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {invertColorsWebGL} from '@/services/image/filter/invert-colors-webgl';
import {kuwaharaFilterWebGL} from '@/services/image/filter/kuwahara-filter-webgl';
import {thresholdFilterWebGL} from '@/services/image/filter/threshold-webgl';
import {Interpolation} from '@/services/image/filter/types';

import {createImage, pixelAt, readImage} from './fixtures';

const COLOR = [180, 90, 60] as const;
const SIZE = 12;

function uniformImage(alpha: number): OffscreenCanvas {
  return createImage(SIZE, SIZE, () => [...COLOR, alpha]);
}

const COLOR_FILTERS: [name: string, filter: (image: OffscreenCanvas) => OffscreenCanvas][] = [
  ['adjustColorsWebGL', image => adjustColorsWebGL(image, {saturation: 1.3, gamma: 1.1})],
  ['colorMapFilterWebGL', image => colorMapFilterWebGL(image)[0]],
  ['colorMatchFilterWebGL', image => colorMatchFilterWebGL(image, [...COLOR], 0.08)],
  ['thresholdFilterWebGL', image => thresholdFilterWebGL(image, [0.5], [0.5])[0]!],
  ['invertColorsWebGL', image => invertColorsWebGL(image)],
  ['kuwaharaFilterWebGL', image => kuwaharaFilterWebGL(image, [2])[0]!],
];

describe('alpha handling', () => {
  // A premultiplied texture would feed these shaders COLOR * alpha and shift the result.
  it.each(COLOR_FILTERS)(
    '%s reads straight alpha, so translucency does not shift the color',
    (_name, filter) => {
      const opaque = pixelAt(readImage(filter(uniformImage(255))), SIZE / 2, SIZE / 2);
      const translucent = pixelAt(readImage(filter(uniformImage(128))), SIZE / 2, SIZE / 2);

      for (const channel of [0, 1, 2]) {
        expect(Math.abs(translucent[channel]! - opaque[channel]!)).toBeLessThanOrEqual(8);
      }
    }
  );

  it('resamples on premultiplied alpha, so a transparent edge does not darken the color', () => {
    const edge = createImage(2, 1, x => (x === 0 ? [...COLOR, 255] : [0, 0, 0, 0]));

    const result = readImage(interpolationWebGL(edge, 16, 1, Interpolation.Bilinear));

    const blended = Array.from({length: 16}, (_, x) => pixelAt(result, x, 0)).filter(
      ([, , , alpha]) => alpha > 16 && alpha < 239
    );
    expect(blended.length).toBeGreaterThan(0);
    for (const [r, g, b] of blended) {
      expect(r).toBeGreaterThanOrEqual(COLOR[0] - 8);
      expect(g).toBeCloseTo(COLOR[1], -1);
      expect(b).toBeCloseTo(COLOR[2], -1);
    }
  });
});
