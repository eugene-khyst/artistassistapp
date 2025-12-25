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
import {Matrix} from '~/src/services/math/matrix';

import {linearizeRgbChannel, Rgb, unlinearizeRgbChannel} from './rgb';

const SIZE = 36;
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
    0.000001844289444, 0.0000062053235865, 0.0000310096046799, 0.0001047483849269,
    0.0003536405299538, 0.0009514714056444, 0.0022822631748318, 0.004207329043473,
    0.0066887983719014, 0.0098883960193565, 0.0152494514496311, 0.0214183109449723,
    0.0334229301575068, 0.0513100134918512, 0.070402083939949, 0.0878387072603517,
    0.0942490536184085, 0.0979566702718931, 0.0941521856862608, 0.0867810237486753,
    0.0788565338632013, 0.0635267026203555, 0.05374141675682, 0.042646064357412, 0.0316173492792708,
    0.020885205921391, 0.0138601101360152, 0.0081026402038399, 0.004630102258803,
    0.0024913800051319, 0.0012593033677378, 0.000541646522168, 0.0002779528920067,
    0.0001471080673854, 0.0000610327472927, 0.0000343873229523,
  ],
]);

const SHAPE_WEIGHT = 0.5;

function kubelkaMunkKS(r: number): number {
  return (1 - r) ** 2 / (2 * r);
}

function kubelkaMunkKM(ks: number): number {
  return 1 + ks - (ks ** 2 + 2 * ks) ** 0.5;
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
  static readonly WHITE = new Reflectance(Matrix.ones(SIZE, 1));
  static readonly BLACK = new Reflectance(Matrix.fromValue(0.0001, SIZE, 1));

  constructor(private readonly rho: Matrix) {}

  static fromArray(rho: number[] | Float64Array) {
    return new Reflectance(Matrix.fromColumn(rho));
  }

  static fromRgb(rgb: Rgb): Reflectance {
    if (rgb.isBlack()) {
      return Reflectance.BLACK;
    }

    if (rgb.isWhite()) {
      return Reflectance.WHITE;
    }

    const d = Matrix.tridiag(SIZE, -2, 4, -2);
    d.set(0, 0, 2);
    d.set(SIZE - 1, SIZE - 1, 2);

    const rgbMatrix = Matrix.fromColumn(rgb.toTuple()).map(linearizeRgbChannel);

    let z = Matrix.zeros(SIZE, 1);
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
      z = z.add(delta.getRows(0, SIZE));
      lambda = lambda.add(delta.getRows(SIZE, SIZE + 3));

      const solutionFound = f.all((v: number) => Math.abs(v) < FUNCTION_SOLUTION_TOLERANCE);
      if (solutionFound) {
        const rho: Matrix = z.map(v => (Math.tanh(v) + 1) / 2);
        return new Reflectance(rho);
      }

      iteration++;
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
    const y1 = this.rho.flatten();
    const y2 = rho.flatten();
    let dot = 0;
    let sumSq1 = 0;
    let sumSq2 = 0;
    let sumSqDiff = 0;
    for (let i = 0; i < SIZE; i++) {
      const v1 = y1[i]!;
      const v2 = y2[i]!;
      dot += v1 * v2;
      sumSq1 += v1 ** 2;
      sumSq2 += v2 ** 2;
      sumSqDiff += (v1 - v2) ** 2;
    }
    const cosTheta = dot / Math.sqrt(sumSq1 * sumSq2);
    const angle = Math.acos(clamp(cosTheta, -1, 1));
    const normAngle = 1 - angle / (Math.PI / 2);
    const normDist = 1 - Math.sqrt(sumSqDiff / SIZE);
    return scalar * Math.pow(normAngle, SHAPE_WEIGHT) * Math.pow(normDist, 1 - SHAPE_WEIGHT);
  }

  getLuminance() {
    return CIE_CMF_Y.multiply(this.rho).get(0, 0);
  }

  static mixKM(reflectances: Reflectance[], ratios: number[]): Reflectance {
    validateRatios(reflectances, ratios);
    if (reflectances.length === 1) {
      return reflectances[0]!;
    }
    const rhoMix = Matrix.zeros(SIZE, 1);
    const concentrations = reflectances.map((reflectance, i) => {
      const luminance = Math.max(Number.EPSILON, reflectance.getLuminance());
      return ratios[i]! ** 2 * luminance;
    });
    const totalConcentration = concentrations.reduce((sum, weight) => sum + weight, 0);
    for (let i = 0; i < SIZE; i++) {
      let ksMix = 0;
      for (let j = 0; j < reflectances.length; j++) {
        const reflectance = reflectances[j]!;
        const concentration = concentrations[j]!;
        const r = reflectance.rho.get(i, 0);
        ksMix += kubelkaMunkKS(r) * concentration;
      }
      rhoMix.set(i, 0, kubelkaMunkKM(ksMix / totalConcentration));
    }
    return new Reflectance(rhoMix);
  }
}
