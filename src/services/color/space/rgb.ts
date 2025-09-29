/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {clamp} from '~/src/services/math/clamp';

import {Reflectance} from './reflectance';

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

export function rgbToNumber([r, g, b]: RgbTuple): number {
  return (r! << 16) + (g! << 8) + b!;
}

export type RgbTuple = [r: number, g: number, b: number];

export class Rgb {
  private static readonly HEX_VALUES = new Uint8Array(128);
  static {
    '0123456789abcdef'.split('').forEach((char, i) => {
      Rgb.HEX_VALUES[char.charCodeAt(0)] = i;
      Rgb.HEX_VALUES[char.toUpperCase().charCodeAt(0)] = i;
    });
  }

  static readonly WHITE = new Rgb(255, 255, 255);
  static readonly BLACK = new Rgb(0, 0, 0);

  constructor(
    public readonly r: number,
    public readonly g: number,
    public readonly b: number
  ) {}

  static fromTuple([r, g, b]: RgbTuple): Rgb {
    return new Rgb(r!, g!, b!);
  }

  static fromHex(hex: string): Rgb {
    const offset = hex.charCodeAt(0) === 35 ? 1 : 0; // Remove # if present
    const len = hex.length - offset;
    if (len === 6) {
      const h0 = Rgb.HEX_VALUES[hex.charCodeAt(offset)]!;
      const h1 = Rgb.HEX_VALUES[hex.charCodeAt(offset + 1)]!;
      const h2 = Rgb.HEX_VALUES[hex.charCodeAt(offset + 2)]!;
      const h3 = Rgb.HEX_VALUES[hex.charCodeAt(offset + 3)]!;
      const h4 = Rgb.HEX_VALUES[hex.charCodeAt(offset + 4)]!;
      const h5 = Rgb.HEX_VALUES[hex.charCodeAt(offset + 5)]!;
      return new Rgb((h0 << 4) | h1, (h2 << 4) | h3, (h4 << 4) | h5);
    }
    if (len === 3) {
      const h0 = Rgb.HEX_VALUES[hex.charCodeAt(offset)]!;
      const h1 = Rgb.HEX_VALUES[hex.charCodeAt(offset + 1)]!;
      const h2 = Rgb.HEX_VALUES[hex.charCodeAt(offset + 2)]!;
      return new Rgb((h0 << 4) | h0, (h1 << 4) | h1, (h2 << 4) | h2);
    }
    throw new Error(`Can't convert hex ${hex} to RGB`);
  }

  static fromHexOrTuple(color: string | RgbTuple): Rgb {
    if (typeof color === 'string') {
      return Rgb.fromHex(color);
    } else if (Array.isArray(color) || ArrayBuffer.isView(color)) {
      return Rgb.fromTuple(color);
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
