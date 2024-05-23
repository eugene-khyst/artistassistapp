/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Oklab} from '~/src/services/color/space';

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
