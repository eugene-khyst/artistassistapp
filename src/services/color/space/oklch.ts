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

import {Oklab} from './oklab';

export class Oklch {
  constructor(
    public l: number,
    public c: number,
    public h: number
  ) {}

  static fromOklab({l, a, b}: Oklab): Oklch {
    const c = Math.sqrt(a ** 2 + b ** 2);
    const h = Math.atan2(b, a);
    return new Oklch(l, c, h);
  }

  toOklab(): Oklab {
    const a = this.c * Math.cos(this.h);
    const b = this.c * Math.sin(this.h);
    return new Oklab(this.l, a, b);
  }
}
