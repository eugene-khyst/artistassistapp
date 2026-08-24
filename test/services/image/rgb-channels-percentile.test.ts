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

import {linearizeRgbChannel} from '@eugene-khyst/artistassistapp-color-mixer';
import {afterEach, describe, expect, it, vi} from 'vitest';

import {RgbChannelsPercentileCalculator} from '@/services/image/rgb-channels-percentile';

const imageOperations = vi.hoisted(() => ({
  drawImageToOffscreenCanvas: vi.fn(),
  offscreenCanvasToImageData: vi.fn(),
}));

vi.mock('@/utils/graphics', () => imageOperations);

afterEach(() => {
  vi.clearAllMocks();
});

describe('RGB channel percentiles', () => {
  it('does not count fully transparent pixels', () => {
    const image = {close: vi.fn()} as unknown as ImageBitmap;
    imageOperations.drawImageToOffscreenCanvas.mockReturnValueOnce([
      {} as OffscreenCanvas,
      {} as OffscreenCanvasRenderingContext2D,
    ]);
    imageOperations.offscreenCanvasToImageData.mockReturnValueOnce({
      data: new Uint8ClampedArray([0, 0, 0, 0, 128, 64, 32, 255]),
      width: 2,
      height: 1,
    });
    const calculator = new RgbChannelsPercentileCalculator();

    calculator.setImage(image);

    expect(calculator.calculatePercentiles(0.5)).toEqual([128, 64, 32].map(linearizeRgbChannel));
    expect(image.close).toHaveBeenCalledOnce();
  });
});
