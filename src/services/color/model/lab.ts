/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {degrees, nonNegativeAngle, radians} from '../../math';
import {CIE_E, CIE_K, ILLUMINANT_D65, Xyz} from '.';

export function getLightness(luminance: number): number {
  const yr = luminance / ILLUMINANT_D65.y;
  const fy = yr > CIE_E ? Math.cbrt(yr) : (CIE_K * yr + 16) / 116;
  return 116 * fy - 16;
}

export class Lab {
  constructor(
    public l: number,
    public a: number,
    public b: number
  ) {}

  static fromXyz({x, y, z}: Xyz): Lab {
    const xr = x / ILLUMINANT_D65.x;
    const yr = y / ILLUMINANT_D65.y;
    const zr = z / ILLUMINANT_D65.z;

    const fx = xr > CIE_E ? Math.cbrt(xr) : (CIE_K * xr + 16) / 116;
    const fy = yr > CIE_E ? Math.cbrt(yr) : (CIE_K * yr + 16) / 116;
    const fz = zr > CIE_E ? Math.cbrt(zr) : (CIE_K * zr + 16) / 116;

    return new Lab(116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz));
  }

  toXyz(): Xyz {
    const fy = (this.l + 16) / 116;
    const fz = fy - this.b / 200;
    const fx = this.a / 500 + fy;

    const xr = Math.pow(fx, 3) > CIE_E ? Math.pow(fx, 3) : (116 * fx - 16) / CIE_K;
    const yr = this.l > CIE_K * CIE_E ? Math.pow((this.l + 16) / 116, 3) : this.l / CIE_K;
    const zr = Math.pow(fz, 3) > CIE_E ? Math.pow(fz, 3) : (116 * fz - 16) / CIE_K;

    return new Xyz(xr * ILLUMINANT_D65.x, yr * ILLUMINANT_D65.y, zr * ILLUMINANT_D65.z);
  }

  getLightness(): number {
    return this.l;
  }

  getDeltaE2000({l: L2, a: a2, b: b2}: Lab): number {
    const {l: L1, a: a1, b: b1} = this;
    const LBarPrime = (L1 + L2) / 2;
    const C1 = Math.hypot(a1, b1);
    const C2 = Math.hypot(a2, b2);
    const CBar = (C1 + C2) / 2;
    const CBarPow7 = Math.pow(CBar, 7);
    const G = (1 - Math.sqrt(CBarPow7 / (CBarPow7 + 6103515625))) / 2;
    const aPrime1 = a1 * (1 + G);
    const aPrime2 = a2 * (1 + G);
    const CPrime1 = Math.hypot(aPrime1, b1);
    const CPrime2 = Math.hypot(aPrime2, b2);
    const CBarPrime = (CPrime1 + CPrime2) / 2;
    const hPrime1 = nonNegativeAngle(degrees(Math.atan2(b1, aPrime1)));
    const hPrime2 = nonNegativeAngle(degrees(Math.atan2(b2, aPrime2)));
    const HBarPrime =
      Math.abs(hPrime1 - hPrime2) > 180 ? (hPrime1 + hPrime2 + 360) / 2 : (hPrime1 + hPrime2) / 2;
    const T =
      1 -
      0.17 * Math.cos(radians(HBarPrime - 30)) +
      0.24 * Math.cos(radians(2 * HBarPrime)) +
      0.32 * Math.cos(radians(3 * HBarPrime + 6)) -
      0.2 * Math.cos(radians(4 * HBarPrime - 63));
    const deltahPrime =
      Math.abs(hPrime2 - hPrime1) <= 180
        ? hPrime2 - hPrime1
        : hPrime2 <= hPrime1
        ? hPrime2 - hPrime1 + 360
        : hPrime2 - hPrime1 - 360;
    const deltaLPrime = L2 - L1;
    const deltaCPrime = CPrime2 - CPrime1;
    const deltaHPrime = 2 * Math.sqrt(CPrime1 * CPrime2) * Math.sin(radians(deltahPrime / 2));
    const SL =
      1 + (0.015 * Math.pow(LBarPrime - 50, 2)) / Math.sqrt(20 + Math.pow(LBarPrime - 50, 2));
    const SC = 1 + 0.045 * CBarPrime;
    const SH = 1 + 0.015 * CBarPrime * T;
    const deltaTheta = 30 * Math.exp(-Math.pow((HBarPrime - 275) / 25, 2));
    const CBarPrimePow7 = Math.pow(CBarPrime, 7);
    const RC = 2 * Math.sqrt(CBarPrimePow7 / (CBarPrimePow7 + 6103515625));
    const RT = -RC * Math.sin(radians(2 * deltaTheta));
    const KL = 1;
    const KC = 1;
    const KH = 1;
    return Math.sqrt(
      Math.pow(deltaLPrime / (KL * SL), 2) +
        Math.pow(deltaCPrime / (KC * SC), 2) +
        Math.pow(deltaHPrime / (KH * SH), 2) +
        RT * (deltaCPrime / (KC * SC)) * (deltaHPrime / (KH * SH))
    );
  }
}
