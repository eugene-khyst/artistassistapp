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

import {highPass, sharpen, unsharpMask} from '@/services/image/sharpen';
import {SharpenMode} from '@/services/image/sharpen-controls';

const mocks = vi.hoisted(() => ({
  highPassWebGL: vi.fn(),
  toOffscreenCanvas: vi.fn(),
  unsharpMaskWebGL: vi.fn(),
}));

vi.mock('@/services/image/filter/high-pass-webgl', () => ({
  highPassWebGL: mocks.highPassWebGL,
}));
vi.mock('@/services/image/filter/unsharp-mask-webgl', () => ({
  unsharpMaskWebGL: mocks.unsharpMaskWebGL,
}));
vi.mock('@/utils/graphics', () => ({toOffscreenCanvas: mocks.toOffscreenCanvas}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('sharpen', () => {
  it('applies the default unsharp mask', () => {
    const image = {} as ImageBitmap;
    const canvas = {} as OffscreenCanvas;
    const result = {} as OffscreenCanvas;
    mocks.toOffscreenCanvas.mockReturnValueOnce(canvas);
    mocks.unsharpMaskWebGL.mockReturnValueOnce(result);

    expect(unsharpMask(image)).toBe(result);

    expect(mocks.toOffscreenCanvas).toHaveBeenCalledExactlyOnceWith(image);
    expect(mocks.unsharpMaskWebGL).toHaveBeenCalledExactlyOnceWith(canvas, 21, 3, 0.5, 0);
  });

  it('applies the default high-pass sharpening', () => {
    const image = {} as ImageBitmap;
    const canvas = {} as OffscreenCanvas;
    const result = {} as OffscreenCanvas;
    mocks.toOffscreenCanvas.mockReturnValueOnce(canvas);
    mocks.highPassWebGL.mockReturnValueOnce(result);

    expect(highPass(image)).toBe(result);

    expect(mocks.toOffscreenCanvas).toHaveBeenCalledExactlyOnceWith(image);
    expect(mocks.highPassWebGL).toHaveBeenCalledExactlyOnceWith(canvas, 25, 4, 1);
  });

  it('converts strength for each mode', () => {
    const image = {} as ImageBitmap;
    const unsharpCanvas = {} as OffscreenCanvas;
    const highPassCanvas = {} as OffscreenCanvas;
    mocks.toOffscreenCanvas.mockReturnValueOnce(unsharpCanvas).mockReturnValueOnce(highPassCanvas);

    sharpen(image, SharpenMode.UnsharpMask, 3);
    sharpen(image, SharpenMode.HighPass, 3);

    expect(mocks.unsharpMaskWebGL).toHaveBeenCalledExactlyOnceWith(unsharpCanvas, 21, 3, 1.5, 0);
    expect(mocks.highPassWebGL).toHaveBeenCalledExactlyOnceWith(highPassCanvas, 25, 4, 3);
  });
});
