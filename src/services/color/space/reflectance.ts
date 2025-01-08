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

import {Matrix} from '~/src/services/math';

import {linearizeRgbChannel, Rgb, unlinearizeRgbChannel} from './rgb';

const MAX_ITERATIONS = 100;
const FUNCTION_SOLUTION_TOLERANCE = 1.0e-8;

const RHO_TO_LINEAR_RGB = Matrix.fromRows([
  [
    5.47813e-5, 0.000184722, 0.000935514, 0.003096265, 0.009507714, 0.017351596, 0.022073595,
    0.016353161, 0.002002407, -0.016177731, -0.033929391, -0.046158952, -0.06381706, -0.083911194,
    -0.091832385, -0.08258148, -0.052950086, -0.012727224, 0.037413037, 0.091701812, 0.147964686,
    0.181542886, 0.210684154, 0.210058081, 0.181312094, 0.132064724, 0.093723787, 0.057159281,
    0.033469657, 0.018235464, 0.009298756, 0.004023687, 0.002068643, 0.00109484, 0.000454231,
    0.000255925,
  ],
  [
    -4.65552e-5, -0.000157894, -0.000806935, -0.002707449, -0.008477628, -0.016058258, -0.02200529,
    -0.020027434, -0.011137726, 0.003784809, 0.022138944, 0.038965605, 0.063361718, 0.095981626,
    0.126280277, 0.148575844, 0.149044804, 0.14239936, 0.122084916, 0.09544734, 0.067421931,
    0.035691251, 0.01313278, -0.002384996, -0.009409573, -0.009888983, -0.008379513, -0.005606153,
    -0.003444663, -0.001921041, -0.000995333, -0.000435322, -0.000224537, -0.000118838, -4.93038e-5,
    -2.77789e-5,
  ],
  [
    0.00032594, 0.001107914, 0.005677477, 0.01918448, 0.060978641, 0.121348231, 0.184875618,
    0.208804428, 0.197318551, 0.147233899, 0.091819086, 0.046485543, 0.022982618, 0.00665036,
    -0.005816014, -0.012450334, -0.015524259, -0.016712927, -0.01570093, -0.013647887, -0.011317812,
    -0.008077223, -0.005863171, -0.003943485, -0.002490472, -0.001440876, -0.000852895,
    -0.000458929, -0.000248389, -0.000129773, -6.41985e-5, -2.71982e-5, -1.38913e-5, -7.35203e-6,
    -3.05024e-6, -1.71858e-6,
  ],
]);

const RHO_TO_LINEAR_RGB_TRANSPOSE: Matrix = RHO_TO_LINEAR_RGB.transpose();

const CIE_CMF_Y = Matrix.fromRows([
  [
    0.00000184, 0.00000621, 0.00003101, 0.00010475, 0.00035364, 0.00095147, 0.00228226, 0.00420733,
    0.0066888, 0.0098884, 0.01524945, 0.02141831, 0.03342293, 0.05131001, 0.07040208, 0.08783871,
    0.09424905, 0.09795667, 0.09415219, 0.08678102, 0.07885653, 0.0635267, 0.05374142, 0.04264606,
    0.03161735, 0.02088521, 0.01386011, 0.00810264, 0.0046301, 0.00249138, 0.0012593, 0.00054165,
    0.00027795, 0.00014711, 0.00006103, 0.00003439,
  ],
]);

const MAX_EUCLIDEAN_DISTANCE = 6;

function linearToConcentration(t: number, luminance1: number, luminance2: number) {
  const t1 = luminance1 * (1 - t) ** 2;
  const t2 = luminance2 * t ** 2;
  return t2 / (t1 + t2);
}

function euclideanDistance(rho1: Matrix, rho2: Matrix): number {
  let distanceSq = 0;
  for (let i = 0; i < 36; i++) {
    const r1 = rho1.get(i, 0);
    const r2 = rho2.get(i, 0);
    distanceSq += (r1 - r2) ** 2;
  }
  return Math.sqrt(distanceSq);
}

function cosineSimilarity(rho1: Matrix, rho2: Matrix): number {
  let dotProduct = 0;
  let magnitudeY1 = 0;
  let magnitudeY2 = 0;
  for (let i = 0; i < 36; i++) {
    const r1 = rho1.get(i, 0);
    const r2 = rho2.get(i, 0);
    dotProduct += r1 * r2;
    magnitudeY1 += r1 ** 2;
    magnitudeY2 += r2 ** 2;
  }
  return magnitudeY1 !== 0 && magnitudeY2 !== 0
    ? dotProduct / (Math.sqrt(magnitudeY1) * Math.sqrt(magnitudeY2))
    : 0;
}

function validateRatios(reflectances: Reflectance[], ratios: number[]) {
  if (!reflectances.length) {
    throw new Error('Reflectances must not be empty');
  }
  if (reflectances.length !== ratios.length) {
    throw new Error(
      `Reflectances size must match ratios size: ${reflectances.length} != ${ratios.length}`
    );
  }
  if (ratios.includes(0)) {
    throw new Error('Ratio must not be 0');
  }
}

export class Reflectance {
  static readonly WHITE = new Reflectance(Matrix.ones(36, 1));
  static readonly BLACK = new Reflectance(Matrix.fromValue(0.0001, 36, 1));

  constructor(private readonly rho: Matrix) {}

  static fromArray(rho: number[]) {
    return new Reflectance(Matrix.fromColumn(rho));
  }

  static fromRgb(rgb: Rgb): Reflectance {
    if (rgb.isBlack()) {
      return Reflectance.BLACK;
    }

    if (rgb.isWhite()) {
      return Reflectance.WHITE;
    }

    const d = Matrix.tridiag(36, -2, 4, -2);
    d.set(0, 0, 2);
    d.set(35, 35, 2);

    const rgbMatrix = Matrix.fromColumn(rgb.toRgbTuple()).map(linearizeRgbChannel);

    let z = Matrix.zeros(36, 1);
    let lambda = Matrix.zeros(3, 1);
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const d0: Matrix = z.map((v: number) => (Math.tanh(v) + 1) / 2);
      const d1: Matrix = Matrix.diag(z.map((v: number) => (1 / Math.cosh(v)) ** 2 / 2).flatten());
      const d2: Matrix = Matrix.diag(
        z.map((v: number) => -((1 / Math.cosh(v)) ** 2) * Math.tanh(v)).flatten()
      );

      const f: Matrix = d
        .multiply(z)
        .add(d1.multiply(RHO_TO_LINEAR_RGB_TRANSPOSE).multiply(lambda))
        .concatRows(RHO_TO_LINEAR_RGB.multiply(d0).subtract(rgbMatrix));

      const j: Matrix = d
        .add(Matrix.diag(d2.multiply(RHO_TO_LINEAR_RGB_TRANSPOSE).multiply(lambda).flatten()))
        .concatColumns(d1.multiply(RHO_TO_LINEAR_RGB_TRANSPOSE))
        .concatRows(RHO_TO_LINEAR_RGB.multiply(d1).concatColumns(Matrix.zeros(3, 3)));

      const delta: Matrix = j.inverse().multiply(f.multiplyByScalar(-1));
      z = z.add(delta.getRows(0, 36));
      lambda = lambda.add(delta.getRows(36, 39));

      const solutionFound = f.all((v: number) => Math.abs(v) < FUNCTION_SOLUTION_TOLERANCE);
      if (solutionFound) {
        const rho: Matrix = z.map(v => (Math.tanh(v) + 1) / 2);
        return new Reflectance(rho);
      }

      iteration += 1;
    }
    throw new Error(`No solution found in ${MAX_ITERATIONS} iterations.`);
  }

  toRgb(): Rgb {
    const rgb: Matrix = RHO_TO_LINEAR_RGB.multiply(this.rho).map(unlinearizeRgbChannel);
    return new Rgb(rgb.get(0, 0), rgb.get(1, 0), rgb.get(2, 0));
  }

  toArray(): Float64Array {
    return this.rho.flatten();
  }

  calculateSimilarity({rho}: Reflectance, scalar = 100): number {
    const distance = euclideanDistance(this.rho, rho);
    const cosSim = cosineSimilarity(this.rho, rho);
    const normDistance = 1 - distance / MAX_EUCLIDEAN_DISTANCE;
    const normCosSim = (cosSim + 1) / 2;
    return scalar * Math.sqrt(normDistance * normCosSim);
  }

  getLuminance() {
    return CIE_CMF_Y.multiply(this.rho).get(0, 0);
  }

  mixWith(reflectance: Reflectance, t: number): Reflectance {
    const luminance1 = this.getLuminance();
    const luminance2 = reflectance.getLuminance();
    const concentration: number = linearToConcentration(t, luminance1, luminance2);
    const rhoMix = Matrix.zeros(36, 1);
    for (let i = 0; i < 36; i++) {
      const r1 = this.rho.get(i, 0);
      const r2 = reflectance.rho.get(i, 0);
      const ks =
        (1 - concentration) * ((1 - r1) ** 2 / (2 * r1)) +
        concentration * ((1 - r2) ** 2 / (2 * r2));
      const rMix = 1 + ks - Math.sqrt(ks ** 2 + 2 * ks);
      rhoMix.set(i, 0, rMix);
    }
    return new Reflectance(rhoMix);
  }

  static mixKM(reflectances: Reflectance[], ratios: number[]): Reflectance {
    validateRatios(reflectances, ratios);
    if (reflectances.length === 1) {
      return reflectances[0]!;
    }
    let reflectance1 = reflectances[0]!;
    let ratio1 = ratios[0]!;
    for (let i = 1; i < reflectances.length; i++) {
      const reflectance2 = reflectances[i]!;
      const ratio2 = ratios[i]!;
      reflectance1 = reflectance1.mixWith(reflectance2, ratio2 / (ratio1 + ratio2));
      ratio1 += ratio2;
    }
    return reflectance1;
  }
}
