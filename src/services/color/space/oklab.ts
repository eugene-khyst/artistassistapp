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

import {Oklch} from './oklch';
import {linearizeRgbChannel as linearize, Rgb, unlinearizeRgbChannel as unlinearize} from './rgb';

export class Oklab {
  constructor(
    public l: number,
    public a: number,
    public b: number
  ) {}

  static fromRgb({r, g, b}: Rgb): Oklab {
    const lr = linearize(r);
    const lg = linearize(g);
    const lb = linearize(b);

    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);

    return new Oklab(
      0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
      1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
      0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
    );
  }

  toRgb(): Rgb {
    const l_ = this.l + 0.3963377774 * this.a + 0.2158037573 * this.b;
    const m_ = this.l - 0.1055613458 * this.a - 0.0638541728 * this.b;
    const s_ = this.l - 0.0894841775 * this.a - 1.291485548 * this.b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

    return new Rgb(unlinearize(r), unlinearize(g), unlinearize(b));
  }

  toOklch(): Oklch {
    return Oklch.fromOklab(this);
  }

  getDeltaEOk({l: L2, a: a2, b: b2}: Oklab, scalar = 1): number {
    const {l: L1, a: a1, b: b1} = this;
    const dL = L1 - L2;
    const da = a1 - a2;
    const db = b1 - b2;
    return scalar * Math.sqrt(dL ** 2 + da ** 2 + db ** 2);
  }
}
