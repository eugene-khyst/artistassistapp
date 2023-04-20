/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Matrix} from '../../math';
import {Rgb, linearizeRgbComponent as linearize, unlinearizeRgbComponent as unlinearize} from '.';

const MAX_ITERATIONS = 100;
const FUNCTION_SOLUTION_TOLERANCE = 1.0e-8;

const RHO_TO_LINEAR_RGB: Matrix = new Matrix([
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

export class Reflectance {
  static WHITE = new Reflectance(Matrix.ones(36, 1));
  static BLACK = new Reflectance(Matrix.ones(36, 1).multiplyByScalar(0.0001));

  constructor(private rho: Matrix) {}

  static fromArray(rho: number[]) {
    return new Reflectance(Matrix.fromColumns([rho]));
  }

  static fromRgb(rgb: Rgb): Reflectance {
    if (rgb.isBlack()) {
      return Reflectance.BLACK;
    }

    if (rgb.isWhite()) {
      return Reflectance.WHITE;
    }

    const d: Matrix = Matrix.tridiag(36, -2, 4, -2);
    d.set(0, 0, 2);
    d.set(35, 35, 2);

    const rgbMatrix: Matrix = new Matrix([
      [linearize(rgb.r)],
      [linearize(rgb.g)],
      [linearize(rgb.b)],
    ]);

    let z = Matrix.zeros(36, 1);
    let lambda = Matrix.zeros(3, 1);
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const d0: Matrix = z.map((v: number) => (Math.tanh(v) + 1) / 2);
      const d1: Matrix = Matrix.diag(
        z.map((v: number) => Math.pow(1 / Math.cosh(v), 2) / 2).flatten()
      );
      const d2: Matrix = Matrix.diag(
        z.map((v: number) => -Math.pow(1 / Math.cosh(v), 2) * Math.tanh(v)).flatten()
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
      z = z.add(new Matrix(delta.getRows(0, 36)));
      lambda = lambda.add(new Matrix(delta.getRows(36, 39)));

      let solutionFound = true;
      f.forEach((v: number) => {
        solutionFound &&= Math.abs(v) < FUNCTION_SOLUTION_TOLERANCE;
      });
      if (solutionFound) {
        const rho: Matrix = z.map(v => (Math.tanh(v) + 1) / 2);
        return new Reflectance(rho);
      }

      iteration += 1;
    }
    throw new Error(`No solution found in ${MAX_ITERATIONS} iterations.`);
  }

  toRgb(): Rgb {
    const linearRgb: Matrix = RHO_TO_LINEAR_RGB.multiply(this.rho);
    const r: number = linearRgb.get(0, 0);
    const g: number = linearRgb.get(1, 0);
    const b: number = linearRgb.get(2, 0);
    return new Rgb(unlinearize(r), unlinearize(g), unlinearize(b));
  }

  toArray(): number[] {
    return this.rho.flatten();
  }

  static mixSubtractively(reflectances: Reflectance[], fractions: number[]): Reflectance {
    const total: number = fractions.reduce((a: number, b: number) => a + b, 0);
    const weights: number[] = fractions.map((weight: number) => weight / total);

    let rhoMix: Matrix = reflectances[0].rho.map((v: number) => Math.pow(v, weights[0]));
    for (let i = 1; i < reflectances.length; i++) {
      rhoMix = rhoMix.dotMultiply(reflectances[i].rho.map((v: number) => Math.pow(v, weights[i])));
    }
    return new Reflectance(rhoMix);
  }
}
