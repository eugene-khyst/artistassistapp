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

import type {RgbTuple} from './rgb';
import {linearizeRgbChannel as linearize, unlinearizeRgbChannel as unlinearize} from './rgb';

export type OklabTuple = [l: number, a: number, b: number];

export function writeRgbToOklab(
  r: number,
  g: number,
  b: number,
  out: Float32Array | number[],
  offset: number
): void {
  const lr = linearize(r);
  const lg = linearize(g);
  const lb = linearize(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  out[offset] = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  out[offset + 1] = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  out[offset + 2] = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
}

export function rgbToOklab(r: number, g: number, b: number): OklabTuple {
  const out: OklabTuple = [0, 0, 0];
  writeRgbToOklab(r, g, b, out, 0);
  return out;
}

export function writeOklabToRgb(
  l: number,
  a: number,
  b: number,
  out: Uint8ClampedArray | number[],
  offset: number
): void {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;

  const rc = 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  const gc = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  const bc = -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc;

  out[offset] = unlinearize(rc);
  out[offset + 1] = unlinearize(gc);
  out[offset + 2] = unlinearize(bc);
}

export function oklabToRgb(l: number, a: number, b: number): RgbTuple {
  const out: RgbTuple = [0, 0, 0];
  writeOklabToRgb(l, a, b, out, 0);
  return out;
}

export function deltaEOk(
  l1: number,
  a1: number,
  b1: number,
  l2: number,
  a2: number,
  b2: number,
  scalar = 1
): number {
  return scalar * Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
