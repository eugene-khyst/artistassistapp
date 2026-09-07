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

import {
  type ColorSet,
  ColorType,
  PAPER_WHITE,
  Reflectance,
  type RgbTuple,
  WHITE,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {ColorQuantization} from '@/services/image/color-quantization';

const graphicsMocks = vi.hoisted(() => ({
  drawImageToOffscreenCanvas: vi.fn(() => []),
  offscreenCanvasToImageData: vi.fn(),
}));

vi.mock('@/utils/graphics', () => graphicsMocks);

const BLUE: RgbTuple = [32, 64, 160];
const colors: ColorSet['colors'] = [
  {
    brand: 1,
    id: 1,
    name: 'Blue',
    rgb: BLUE,
    rho: Array.from(Reflectance.fromRgb(...BLUE).toArray()),
  },
];

beforeEach(() => {
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({}));
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

async function limitedPalettePixels(pixels: RgbTuple[], type: ColorType): Promise<number[][]> {
  const data = new Uint8ClampedArray(pixels.flatMap(rgb => [...rgb, 255]));
  const imageData = {data, width: pixels.length, height: 1} as ImageData;
  const image = {width: pixels.length, height: 1, close: vi.fn()} as unknown as ImageBitmap;
  graphicsMocks.offscreenCanvasToImageData.mockReturnValue(imageData);

  await new ColorQuantization().getLimitedPaletteImage(image, {type, brands: new Map(), colors});

  expect(createImageBitmap).toHaveBeenCalledExactlyOnceWith(imageData);
  return pixels.map((_, i) => Array.from(data.slice(i * 4, i * 4 + 3)));
}

describe.each([ColorType.WatercolorPaint, ColorType.Gouache])('limited palette (%s)', type => {
  it('leaves white and near-white areas as bare paper while retaining paint colors', async () => {
    const pixels = [BLUE, WHITE, [250, 250, 250], BLUE] satisfies RgbTuple[];

    expect(await limitedPalettePixels(pixels, type)).toEqual([
      BLUE,
      PAPER_WHITE,
      PAPER_WHITE,
      BLUE,
    ]);
  });

  it('renders a uniformly near-white image as paper', async () => {
    expect(await limitedPalettePixels([[250, 250, 250]], type)).toEqual([PAPER_WHITE]);
  });

  it('preserves the exact paper color', async () => {
    expect(await limitedPalettePixels([PAPER_WHITE, BLUE], type)).toEqual([PAPER_WHITE, BLUE]);
  });

  it('still renders the paint when there are no white areas', async () => {
    expect(await limitedPalettePixels([BLUE, [33, 65, 161]], type)).toEqual([BLUE, BLUE]);
  });
});
