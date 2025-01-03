/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {clamp} from '~/src/services/math';

import {Oklab} from './oklab';
import {Reflectance} from './reflectance';

const HEX_MATCHER = /^#?([0-9a-f]{3,6})$/i;

function channelToHex(value: number): string {
  const hex = value.toString(16);
  return hex.length < 2 ? '0' + hex : hex;
}

export function linearizeRgbChannel(value: number): number {
  const v = clamp(value, 0, 255) / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function unlinearizeRgbChannel(value: number): number {
  const v = clamp(value, 0, 1);
  return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
}

export function rgbToNumber(r: number, g: number, b: number): number {
  return (r << 16) + (g << 8) + b;
}

export type RgbTuple = [r: number, g: number, b: number];

export class Rgb {
  static WHITE = new Rgb(255, 255, 255);
  static BLACK = new Rgb(0, 0, 0);

  constructor(
    public r: number,
    public g: number,
    public b: number
  ) {}

  static fromHex(hex: string): Rgb {
    const hexMatchArray = HEX_MATCHER.exec(hex);
    if (hexMatchArray !== null) {
      const hexMatch: string = hexMatchArray[1]!;

      if (hexMatch.length === 3) {
        return new Rgb(
          parseInt(hexMatch.charAt(0) + hexMatch.charAt(0), 16),
          parseInt(hexMatch.charAt(1) + hexMatch.charAt(1), 16),
          parseInt(hexMatch.charAt(2) + hexMatch.charAt(2), 16)
        );
      }

      if (hexMatch.length === 6) {
        return new Rgb(
          parseInt(hexMatch.substring(0, 2), 16),
          parseInt(hexMatch.substring(2, 4), 16),
          parseInt(hexMatch.substring(4, 6), 16)
        );
      }
    }
    throw new Error(`Can't convert hex ${hex} to RGB`);
  }

  static fromHexOrTuple(color: string | RgbTuple): Rgb {
    if (typeof color === 'string') {
      return Rgb.fromHex(color);
    } else if (Array.isArray(color)) {
      return new Rgb(...color);
    }
    throw new Error(`Unable to create RGB`);
  }

  toRgbTuple(): RgbTuple {
    return [this.r, this.g, this.b];
  }

  toHex(hashSymbol = true): string {
    return (
      (hashSymbol ? '#' : '') + channelToHex(this.r) + channelToHex(this.g) + channelToHex(this.b)
    );
  }

  toOklab(): Oklab {
    return Oklab.fromRgb(this);
  }

  toReflectance(): Reflectance {
    return Reflectance.fromRgb(this);
  }

  isBlack(): boolean {
    return this.r === 0 && this.g === 0 && this.b === 0;
  }

  isWhite(): boolean {
    return this.r === 255 && this.g === 255 && this.b === 255;
  }

  getLuminance(): number {
    return (
      0.2126 * linearizeRgbChannel(this.r) +
      0.7152 * linearizeRgbChannel(this.g) +
      0.0722 * linearizeRgbChannel(this.b)
    );
  }

  isDark() {
    return this.getLuminance() < 0.5;
  }

  isLight() {
    return !this.isDark();
  }

  equals({r, g, b}: Rgb) {
    return this.r === r && this.g === g && this.b === b;
  }
}
