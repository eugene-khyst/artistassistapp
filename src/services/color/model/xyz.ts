/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Lab, Rgb, linearizeRgbChannel as linearize, unlinearizeRgbChannel as unlinearize} from '.';

export class Xyz {
  constructor(
    public x: number,
    public y: number,
    public z: number
  ) {}

  static fromRgb({r, g, b}: Rgb): Xyz {
    const lr = linearize(r);
    const lg = linearize(g);
    const lb = linearize(b);
    const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
    const y = 0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb;
    const z = 0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb;
    return new Xyz(x, y, z);
  }

  toRgb(): Rgb {
    const r = 3.2404542 * this.x + -1.5371385 * this.y + -0.4985314 * this.z;
    const g = -0.969266 * this.x + 1.8760108 * this.y + 0.041556 * this.z;
    const b = 0.0556434 * this.x + -0.2040259 * this.y + 1.0572252 * this.z;
    return new Rgb(unlinearize(r), unlinearize(g), unlinearize(b));
  }

  toLab(): Lab {
    return Lab.fromXyz(this);
  }

  getLuminance(): number {
    return this.y;
  }
}
