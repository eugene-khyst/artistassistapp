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

import {degrees, radians} from '@/services/math/geometry';

import type {OklabTuple} from './oklab';

export type OklchTuple = [l: number, c: number, hDeg: number];

export function oklabToOklch(l: number, a: number, b: number): OklchTuple {
  const c = Math.hypot(a, b);
  const hDeg = degrees(Math.atan2(b, a));
  return [l, c, hDeg];
}

export function oklchToOklab(l: number, c: number, hDeg: number): OklabTuple {
  const hRad = radians(hDeg);
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  return [l, a, b];
}
