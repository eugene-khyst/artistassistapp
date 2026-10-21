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

import {deltaEOKr2, rgbToOklab, type RgbTuple} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it} from 'vitest';

import {getRgbTonalValue, TONAL_VALUES} from '@/services/color/tonal-value';
import {
  quantizeColors,
  quantizeColorsByTonalValue,
  rgbTransformInOklab,
} from '@/services/image/filter/color-quantize';

function imageFromColors(colors: RgbTuple[], repetitions = 1): ImageData {
  return {
    width: colors.length,
    height: repetitions,
    data: new Uint8ClampedArray(
      Array.from({length: repetitions}, () => colors.flatMap(rgb => [...rgb, 255])).flat()
    ),
  } as ImageData;
}

function colorKeys({data}: ImageData): string[] {
  return Array.from({length: data.length / 4}, (_, i) =>
    Array.from(data.slice(i * 4, i * 4 + 3)).join(',')
  );
}

function pixels({data}: ImageData): RgbTuple[] {
  return Array.from({length: data.length / 4}, (_, i) => [
    data[i * 4]!,
    data[i * 4 + 1]!,
    data[i * 4 + 2]!,
  ]);
}

describe('quantizeColorsByTonalValue', () => {
  it.each([12, 24, 36, 48])('preserves rare tonal values within a budget of %i', maxColors => {
    const dominant: RgbTuple[] = Array.from({length: 60}, (_, i) => [60 + i, 60 + i, 60 + i]);
    const source: RgbTuple[] = [
      ...Array.from({length: 100}, () => dominant).flat(),
      [0, 0, 0],
      [30, 30, 30],
      [140, 140, 140],
      [180, 180, 180],
      [225, 225, 225],
      [255, 255, 255],
    ];
    const image = imageFromColors(source);

    quantizeColorsByTonalValue(image, maxColors);

    const result = pixels(image);
    expect(new Set(colorKeys(image)).size).toBe(maxColors);
    for (const [i, rgb] of result.entries()) {
      expect(getRgbTonalValue(rgb)).toBe(getRgbTonalValue(source[i]!));
    }
    const palette = [...new Map(result.map(rgb => [rgb.join(','), rgb])).values()];
    for (const value of TONAL_VALUES) {
      expect(palette.filter(rgb => getRgbTonalValue(rgb) === value).length).toBeGreaterThanOrEqual(
        2
      );
    }
  });

  it('keeps a black-and-white image at two colors', () => {
    const source = [
      [0, 0, 0],
      [255, 255, 255],
    ] satisfies RgbTuple[];
    const image = imageFromColors(source, 100);

    quantizeColorsByTonalValue(image, 48);

    expect(new Set(colorKeys(image))).toEqual(new Set(['0,0,0', '255,255,255']));
  });

  it('gives unused slots to the populated tonal values', () => {
    const source: RgbTuple[] = Array.from({length: 50}, (_, i) => [60 + i, 60 + i, 60 + i]);
    const image = imageFromColors(source, 5);

    quantizeColorsByTonalValue(image, 24);

    expect(new Set(colorKeys(image)).size).toBe(24);
    expect(pixels(image).every(rgb => getRgbTonalValue(rgb) === getRgbTonalValue(source[0]!))).toBe(
      true
    );
  });

  it.each([1, 2, 3])('respects a budget of %i when not every tonal value can fit', maxColors => {
    const source: RgbTuple[] = [
      [0, 0, 0],
      [100, 100, 100],
      [180, 180, 180],
      [255, 255, 255],
    ];
    const image = imageFromColors(source, 5);

    quantizeColorsByTonalValue(image, maxColors);

    const palette = new Set(colorKeys(image));
    expect(palette.size).toBe(maxColors);
    const sourceColors = new Set(source.map(rgb => rgb.join(',')));
    for (const key of palette) {
      expect(sourceColors.has(key)).toBe(true);
    }
  });
});

describe('quantizeColors', () => {
  it.each([24, 36, 48, 60])('uses the available color budget (%i)', maxColors => {
    const colors: RgbTuple[] = Array.from({length: 40}, (_, i) => [
      (i * 47) % 256,
      (i * 89) % 256,
      (i * 131) % 256,
    ]);
    const image = imageFromColors(colors, 400);

    quantizeColors(image, maxColors);

    expect(new Set(colorKeys(image)).size).toBe(Math.min(maxColors, colors.length));
    const sourceColors = new Set(colors.map(rgb => rgb.join(',')));
    for (const key of new Set(colorKeys(image))) {
      expect(sourceColors.has(key)).toBe(true);
    }
  });

  it('always maps identical input colors to the same output color', () => {
    const colors: RgbTuple[] = Array.from({length: 100}, (_, i) => [
      (i * 47) % 256,
      (i * 89) % 256,
      (i * 131) % 256,
    ]);
    const image = imageFromColors(colors, 20);

    quantizeColors(image, 24);

    const keys = colorKeys(image);
    for (let i = colors.length; i < keys.length; i++) {
      expect(keys[i]).toBe(keys[i % colors.length]);
    }
  });

  it('preserves a flat image without inventing colors', () => {
    const image = imageFromColors([[48, 100, 164]], 15);

    quantizeColors(image, 48);

    expect(new Set(colorKeys(image))).toEqual(new Set(['48,100,164']));
  });

  it('preserves common shades instead of spending the budget on rare nearby colors', () => {
    const image = imageFromColors([
      ...Array.from({length: 1000}, (): RgbTuple => [100, 100, 100]),
      ...Array.from({length: 1000}, (): RgbTuple => [101, 101, 101]),
      [200, 200, 200],
      [210, 210, 210],
    ]);

    quantizeColors(image, 3);

    const palette = new Set(colorKeys(image));
    expect(palette.size).toBe(3);
    expect(palette.has('100,100,100')).toBe(true);
    expect(palette.has('101,101,101')).toBe(true);
  });

  it('chooses the same palette when pixel order changes', () => {
    const colors: RgbTuple[] = Array.from({length: 128}, (_, i) => [
      (i * 47) % 256,
      (i * 89) % 256,
      (i * 131) % 256,
    ]);
    const forward = imageFromColors(colors, 3);
    const reverse = imageFromColors([...colors].reverse(), 3);

    quantizeColors(forward, 24);
    quantizeColors(reverse, 24);

    expect([...new Set(colorKeys(forward))].sort()).toEqual(
      [...new Set(colorKeys(reverse))].sort()
    );
  });

  it.each(['gray', 'sepia', 'color'] as const)(
    'maps each %s pixel to its nearest final palette color',
    kind => {
      const colors: RgbTuple[] = Array.from({length: 128}, (_, i) => {
        const t = i / 127;
        if (kind === 'gray') {
          const value = Math.round(255 * t);
          return [value, value, value];
        }
        if (kind === 'sepia') {
          return [Math.round(50 + 190 * t), Math.round(35 + 180 * t), Math.round(20 + 150 * t)];
        }
        return [(i * 47) % 256, (i * 89) % 256, (i * 131) % 256];
      });
      const image = imageFromColors(colors);

      quantizeColors(image, 24);

      const result = pixels(image).map(rgb => rgbToOklab(...rgb));
      for (const [i, rgb] of colors.entries()) {
        const original = rgbToOklab(...rgb);
        const distance = deltaEOKr2(...original, ...result[i]!);
        const nearest = Math.min(...result.map(color => deltaEOKr2(...original, ...color)));
        expect(distance).toBeCloseTo(nearest, 6);
      }
    }
  );

  it('keeps alpha while assigning the nearest palette colors', () => {
    const image = imageFromColors([
      [0, 0, 0],
      [100, 100, 100],
      [255, 255, 255],
    ]);
    image.data[3] = 0;
    image.data[7] = 128;

    quantizeColors(image, 2);

    expect([image.data[3], image.data[7], image.data[11]]).toEqual([0, 128, 255]);
  });

  it('keeps dithering active when several source colors map to the same paint', () => {
    const colors: RgbTuple[] = [
      [0, 0, 0],
      ...Array.from({length: 62}, (): RgbTuple => [99, 99, 99]),
      [255, 255, 255],
    ];
    const image = imageFromColors(colors, 16);
    const merged = imageFromColors(colors, 16);
    const transform = rgbTransformInOklab(([r]) => (r < 128 ? [0, 0, 0] : [255, 255, 255]));

    quantizeColors(image, 24, true, transform);
    quantizeColors(merged, 2, true, transform);

    const mismatchedBytes = image.data.reduce(
      (count, value, i) => count + Number(value !== merged.data[i]),
      0
    );
    expect(mismatchedBytes).toBe(0);
    const ditheredMidtones = pixels(image).filter((_, i) => i % 64 !== 0 && i % 64 !== 63);
    expect(new Set(ditheredMidtones.map(rgb => rgb.join(',')))).toEqual(
      new Set(['0,0,0', '255,255,255'])
    );
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid color budget (%s)',
    maxColors => {
      expect(() => {
        quantizeColors(imageFromColors([[0, 0, 0]]), maxColors);
      }).toThrow(RangeError);
    }
  );
});
