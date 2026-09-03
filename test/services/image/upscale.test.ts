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
  upscaleTileCoreSize,
  upscaleTileSpans,
} from '@/services/image/upscale';
import type {OnnxModel} from '@/services/ml/types';

vi.mock('@/services/image/filter/interpolation-webgl', () => ({interpolationWebGL: vi.fn()}));
vi.mock('@/services/ml/image-transformer', () => ({transformImageInSession: vi.fn()}));

const CORE_SIZE = 512;
const HALO = 48;

const model = (maxPixelCount?: number) => ({maxPixelCount}) as OnnxModel;

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

describe('upscale tile core size', () => {
  it('uses the fixed core size while the model budget allows it', () => {
    expect(upscaleTileCoreSize(model(1280 * 720))).toBe(CORE_SIZE);
    expect(upscaleTileCoreSize(model(608 * 608))).toBe(CORE_SIZE);
    expect(upscaleTileCoreSize(model())).toBe(CORE_SIZE);
  });

  it('shrinks the core so a padded tile never exceeds a smaller budget', () => {
    expect(upscaleTileCoreSize(model(400 * 400))).toBe(400 - 2 * HALO);
    for (const budget of [250 * 250, 300 * 300, 400 * 400, 607 * 607]) {
      expect((upscaleTileCoreSize(model(budget)) + 2 * HALO) ** 2).toBeLessThanOrEqual(budget);
    }
  });

  it('stays positive for a budget smaller than the halo', () => {
    expect(upscaleTileCoreSize(model(16))).toBeGreaterThan(0);
  });
});

describe('upscale tile spans', () => {
  const sizes = [1, 47, 511, 512, 513, 1000, 1024, 1025, 1999, 2048, 3000];

  it('covers the image exactly, without gaps or overlaps', () => {
    for (const size of sizes) {
      const spans = upscaleTileSpans(size, CORE_SIZE);
      expect(spans[0]!.start).toBe(0);
      expect(spans.at(-1)!.end).toBe(size);
      spans.forEach((span, index) => {
        expect(span.end).toBeGreaterThan(span.start);
        if (index > 0) {
          expect(span.start).toBe(spans[index - 1]!.end);
        }
      });
    }
  });

  it('splits into the fewest tiles of the given core size', () => {
    for (const size of sizes) {
      const spans = upscaleTileSpans(size, CORE_SIZE);
      expect(spans).toHaveLength(Math.ceil(size / CORE_SIZE));
      for (const {start, end} of spans) {
        expect(end - start).toBeLessThanOrEqual(CORE_SIZE);
      }
    }
  });

  it('pads every core by the halo, clamped to the image', () => {
    for (const size of sizes) {
      for (const span of upscaleTileSpans(size, CORE_SIZE)) {
        expect(span.paddedStart).toBe(Math.max(0, span.start - HALO));
        expect(span.paddedEnd).toBe(Math.min(size, span.end + HALO));
        expect(span.paddedStart).toBeGreaterThanOrEqual(0);
        expect(span.paddedEnd).toBeLessThanOrEqual(size);
      }
    }
  });

  it('uses a single unpadded tile when the image fits one core', () => {
    expect(upscaleTileSpans(500, CORE_SIZE)).toEqual([
      {start: 0, end: 500, paddedStart: 0, paddedEnd: 500},
    ]);
  });
});
