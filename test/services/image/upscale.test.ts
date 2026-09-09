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

import {describe, expect, it, vi} from 'vitest';

import {
  MAX_UPSCALE_OUTPUT_PIXELS,
  MAX_UPSCALE_OUTPUT_SIDE,
  upscaledSize,
  upscaleFactor,
} from '@/services/image/upscale';

vi.mock('@/services/ml/tiled-image-transformer', () => ({
  tileCoreSize: vi.fn(),
  transformImageInTiles: vi.fn(),
}));

// The largest square whose output still fits the area cap at the given factor.
function widestSquare(factor: number): number {
  return Math.floor(Math.sqrt(MAX_UPSCALE_OUTPUT_PIXELS) / factor);
}

describe('upscale factor', () => {
  it('prefers the model scale while the output fits', () => {
    expect(upscaleFactor({width: 640, height: 480})).toBe(4);
    expect(upscaleFactor({width: widestSquare(4), height: widestSquare(4)})).toBe(4);
  });

  it('falls back to half the model scale when the area cap is exceeded', () => {
    expect(upscaleFactor({width: widestSquare(4) + 1, height: widestSquare(4)})).toBe(2);
    expect(upscaleFactor({width: widestSquare(2), height: widestSquare(2)})).toBe(2);
  });

  it('falls back when only the side cap is exceeded', () => {
    const widestSide = MAX_UPSCALE_OUTPUT_SIDE / 4;
    expect(upscaleFactor({width: widestSide, height: 256})).toBe(4);
    expect(upscaleFactor({width: widestSide + 1, height: 256})).toBe(2);
  });

  it('refuses an image that no factor fits', () => {
    expect(upscaleFactor({width: widestSquare(2) + 1, height: widestSquare(2)})).toBeNull();
    expect(upscaleFactor({width: MAX_UPSCALE_OUTPUT_SIDE / 2 + 1, height: 256})).toBeNull();
  });

  it('never exceeds either cap', () => {
    for (let width = 1; width <= 5000; width += 7) {
      for (const height of [1, 256, 999, 1024, 2048, 3000]) {
        const size = upscaledSize({width, height});
        if (size) {
          expect(size.width * size.height).toBeLessThanOrEqual(MAX_UPSCALE_OUTPUT_PIXELS);
          expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(MAX_UPSCALE_OUTPUT_SIDE);
          expect(size.width / width).toBe(size.height / height);
        }
      }
    }
  });

  it('reports the upscaled size', () => {
    expect(upscaledSize({width: 1000, height: 500})).toEqual({width: 4000, height: 2000});
    expect(upscaledSize({width: 4000, height: 4000})).toBeNull();
  });
});
