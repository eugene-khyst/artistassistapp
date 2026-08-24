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

import {afterEach, describe, expect, it, vi} from 'vitest';

import {removeBackground} from '@/services/image/remove-background';

const imageOperations = vi.hoisted(() => ({
  applyMask: vi.fn(),
  interpolate: vi.fn(),
}));

vi.mock('@/services/image/filter/interpolation-webgl', () => ({
  Interpolation: {Bilinear: 'bilinear'},
  interpolationWebGL: imageOperations.interpolate,
}));

vi.mock('@/utils/graphics', () => ({
  applyMask: imageOperations.applyMask,
}));

function createImage(width: number, height: number): ImageBitmap {
  return {width, height, close: vi.fn()};
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('Background removal', () => {
  it('upscales a model-resolution mask only while applying it', () => {
    const image = createImage(100, 80);
    const mask = createImage(20, 16);
    const upscaledMask = createImage(100, 80);
    const result = {} as OffscreenCanvas;
    imageOperations.interpolate.mockReturnValueOnce(upscaledMask);
    imageOperations.applyMask.mockReturnValueOnce(result);

    const actual = removeBackground(image, mask);

    expect(actual).toBe(result);
    expect(imageOperations.interpolate).toHaveBeenCalledWith(mask, 100, 80, 'bilinear');
    expect(imageOperations.applyMask).toHaveBeenCalledWith(image, upscaledMask);
  });

  it('applies an interpolated full-resolution mask', () => {
    const image = createImage(100, 80);
    const mask = createImage(100, 80);
    const interpolatedMask = createImage(100, 80);
    const result = {} as OffscreenCanvas;
    imageOperations.interpolate.mockReturnValueOnce(interpolatedMask);
    imageOperations.applyMask.mockReturnValueOnce(result);

    const actual = removeBackground(image, mask);

    expect(actual).toBe(result);
    expect(imageOperations.interpolate).toHaveBeenCalledWith(mask, 100, 80, 'bilinear');
    expect(imageOperations.applyMask).toHaveBeenCalledWith(image, interpolatedMask);
  });
});
