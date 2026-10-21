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
  getRgbLuminance,
  type OklabTuple,
  rgbToOklab,
  writeLinearRgbToOklab,
  writeOklabToLinearRgb,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it} from 'vitest';

import {ditherOrdered} from '@/services/image/filter/dither';

const WIDTH = 64;
const HEIGHT = 64;

function flatImage(color: OklabTuple): Float32Array {
  return Float32Array.from(Array.from({length: WIDTH * HEIGHT}, () => color).flat());
}

function meanGrayLuminance(image: Float32Array): number {
  const rgb = new Float64Array(3);
  let total = 0;
  for (let i = 0; i < image.length; i += 3) {
    writeOklabToLinearRgb(image[i]!, image[i + 1]!, image[i + 2]!, rgb, 0);
    total += (rgb[0]! + rgb[1]! + rgb[2]!) / 3;
  }
  return total / (image.length / 3);
}

describe('ditherOrdered', () => {
  it.each([0, 1, 10, 20, 245, 254, 255])(
    'preserves endpoint coverage for gray %i with black and white',
    value => {
      const image = flatImage(rgbToOklab(value, value, value));

      ditherOrdered(image, WIDTH, HEIGHT, [rgbToOklab(0, 0, 0), rgbToOklab(255, 255, 255)]);

      expect(
        Math.abs(meanGrayLuminance(image) - getRgbLuminance(value, value, value))
      ).toBeLessThanOrEqual(0.5 / (WIDTH * HEIGHT) + 1e-7);
    }
  );

  it.each([118, 119, 120, 127, 129, 200])(
    'uses a bracketing partner to preserve the brightness of gray %i',
    value => {
      const image = flatImage(rgbToOklab(value, value, value));
      const palette = [0, 128, 255].map(channel => rgbToOklab(channel, channel, channel));

      ditherOrdered(image, WIDTH, HEIGHT, palette);

      expect(
        Math.abs(meanGrayLuminance(image) - getRgbLuminance(value, value, value))
      ).toBeLessThanOrEqual(0.5 / (WIDTH * HEIGHT) + 1e-7);
    }
  );

  it.each([
    {value: 121, channels: [0, 120, 128, 255]},
    {value: 127, channels: [0, 120, 128, 255]},
    {value: 121, channels: [255, 128, 120, 0]},
    {value: 127, channels: [255, 128, 120, 0]},
  ])(
    'avoids black and white speckles for gray $value with palette $channels',
    ({value, channels}) => {
      const image = flatImage(rgbToOklab(value, value, value));
      const palette = channels.map(channel => rgbToOklab(channel, channel, channel));
      const lowerLightness = rgbToOklab(120, 120, 120)[0];
      const upperLightness = rgbToOklab(128, 128, 128)[0];

      ditherOrdered(image, WIDTH, HEIGHT, palette);

      let outsidePair = 0;
      for (let i = 0; i < image.length; i += 3) {
        outsidePair += Number(
          Math.abs(image[i]! - lowerLightness) > 1e-6 && Math.abs(image[i]! - upperLightness) > 1e-6
        );
      }
      expect(outsidePair).toBe(0);
      const pairLuminanceRange = getRgbLuminance(128, 128, 128) - getRgbLuminance(120, 120, 120);
      expect(
        Math.abs(meanGrayLuminance(image) - getRgbLuminance(value, value, value))
      ).toBeLessThanOrEqual((pairLuminanceRange * 0.5) / (WIDTH * HEIGHT) + 1e-7);
    }
  );

  it.each([0.25, 0.5, 0.75])('mixes equal-lightness colors at proportion %s', fraction => {
    const palette: OklabTuple[] = [
      [0.6, -0.06, 0.06],
      [0.6, 0.06, -0.06],
    ];
    const first = new Float64Array(3);
    const second = new Float64Array(3);
    writeOklabToLinearRgb(...palette[0]!, first, 0);
    writeOklabToLinearRgb(...palette[1]!, second, 0);
    const color: [number, number, number] = [0, 0, 0];
    writeLinearRgbToOklab(
      first[0]! + fraction * (second[0]! - first[0]!),
      first[1]! + fraction * (second[1]! - first[1]!),
      first[2]! + fraction * (second[2]! - first[2]!),
      color,
      0
    );
    const image = flatImage(color);

    ditherOrdered(image, WIDTH, HEIGHT, palette);

    let secondColorCount = 0;
    for (let i = 0; i < image.length; i += 3) {
      expect(image[i]).toBeCloseTo(0.6, 6);
      expect(Math.abs(image[i + 1]!)).toBeCloseTo(0.06, 6);
      expect(image[i + 2]).toBeCloseTo(-image[i + 1]!, 6);
      secondColorCount += Number(image[i + 1]! > 0);
    }
    expect(secondColorCount / (WIDTH * HEIGHT)).toBeCloseTo(fraction, 2);
  });

  it('preserves average brightness when dithering gray with black and white', () => {
    const image = flatImage(rgbToOklab(128, 128, 128));
    const palette = [rgbToOklab(0, 0, 0), rgbToOklab(255, 255, 255)];

    ditherOrdered(image, WIDTH, HEIGHT, palette);

    let whiteCount = 0;
    for (let i = 0; i < image.length; i += 3) {
      whiteCount += Number(image[i]! > 0.5);
    }
    expect(whiteCount / (WIDTH * HEIGHT)).toBeCloseTo(getRgbLuminance(128, 128, 128), 2);
  });

  it('preserves exact palette colors even with a nearby second color', () => {
    const palette: OklabTuple[] = [
      [0.6, 0, 0],
      [0.62, 0.01, 0],
    ];
    const image = flatImage(palette[0]!);
    const original = image.slice();

    ditherOrdered(image, WIDTH, HEIGHT, palette);

    expect(image).toEqual(original);
  });

  it('ignores duplicate palette entries', () => {
    const palette: OklabTuple[] = [
      [0.6, -0.12, 0.12],
      [0.6, 0.12, -0.12],
    ];
    const image = flatImage([0.6, 0, 0]);
    const duplicate = image.slice();

    ditherOrdered(image, WIDTH, HEIGHT, palette);
    ditherOrdered(duplicate, WIDTH, HEIGHT, [palette[0]!, palette[0]!, palette[1]!]);

    const mismatches = duplicate.reduce((count, value, i) => count + Number(value !== image[i]), 0);
    expect(mismatches).toBe(0);
  });
});
