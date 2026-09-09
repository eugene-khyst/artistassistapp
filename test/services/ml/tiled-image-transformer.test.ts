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

import {tileCoreSize, tileSpans} from '@/services/ml/tiled-image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import {IMAGE_SIZE} from '@/utils/graphics';

vi.mock('@/services/image/filter/interpolation-webgl', () => ({interpolationWebGL: vi.fn()}));
vi.mock('@/services/ml/image-transformer', () => ({transformImageInSession: vi.fn()}));

const CORE_SIZE = 512;
const HALO = 48;

const model = (maxPixelCount?: number) => ({maxPixelCount}) as OnnxModel;

describe('tile core size', () => {
  it('uses the given core size while the model budget allows it', () => {
    expect(tileCoreSize(model(1280 * 720), CORE_SIZE, HALO)).toBe(CORE_SIZE);
    expect(tileCoreSize(model(608 * 608), CORE_SIZE, HALO)).toBe(CORE_SIZE);
  });

  it('falls back to the budget the model input uses when the model sets none', () => {
    expect((tileCoreSize(model(), CORE_SIZE, HALO) + 2 * HALO) ** 2).toBeLessThanOrEqual(
      IMAGE_SIZE.SD
    );
  });

  it('shrinks the core so a padded tile never exceeds a smaller budget', () => {
    expect(tileCoreSize(model(400 * 400), CORE_SIZE, HALO)).toBe(400 - 2 * HALO);
    for (const budget of [250 * 250, 300 * 300, 400 * 400, 607 * 607]) {
      expect((tileCoreSize(model(budget), CORE_SIZE, HALO) + 2 * HALO) ** 2).toBeLessThanOrEqual(
        budget
      );
    }
  });

  it('stays positive for a budget smaller than the halo', () => {
    expect(tileCoreSize(model(16), CORE_SIZE, HALO)).toBeGreaterThan(0);
  });
});

describe('tile spans', () => {
  const sizes = [1, 47, 511, 512, 513, 1000, 1024, 1025, 1999, 2048, 3000];

  it('covers the image exactly, without gaps or overlaps', () => {
    for (const size of sizes) {
      const spans = tileSpans(size, CORE_SIZE, HALO);
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
      const spans = tileSpans(size, CORE_SIZE, HALO);
      expect(spans).toHaveLength(Math.ceil(size / CORE_SIZE));
      for (const {start, end} of spans) {
        expect(end - start).toBeLessThanOrEqual(CORE_SIZE);
      }
    }
  });

  it('pads every core by the halo, clamped to the image', () => {
    for (const size of sizes) {
      for (const span of tileSpans(size, CORE_SIZE, HALO)) {
        expect(span.paddedStart).toBe(Math.max(0, span.start - HALO));
        expect(span.paddedEnd).toBe(Math.min(size, span.end + HALO));
        expect(span.paddedStart).toBeGreaterThanOrEqual(0);
        expect(span.paddedEnd).toBeLessThanOrEqual(size);
      }
    }
  });

  it('uses a single unpadded tile when the image fits one core', () => {
    expect(tileSpans(500, CORE_SIZE, HALO)).toEqual([
      {start: 0, end: 500, paddedStart: 0, paddedEnd: 500},
    ]);
  });

  // Feathering fades a tile in over its overlap with the one drawn before it.
  it('overlaps a neighbour by twice the halo', () => {
    const spans = tileSpans(2048, CORE_SIZE, HALO);
    spans.forEach((span, index) => {
      if (index > 0) {
        expect(spans[index - 1]!.paddedEnd - span.paddedStart).toBe(2 * HALO);
      }
    });
  });
});
