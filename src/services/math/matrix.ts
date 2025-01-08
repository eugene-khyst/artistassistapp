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

import type {TypedArray} from '~/src/utils';

const SINGULARITY_THRESHOLD = 1e-11;

export function forwardSubstitution(matrix: Matrix, b: Float64Array): Float64Array {
  const solution = new Float64Array(matrix.rows).fill(0);
  for (let row = 0; row < matrix.rows; row++) {
    let value = 0;
    for (let col = 0; col < row; col++) {
      value += solution[col]! * matrix.get(row, col);
    }
    value = b[row]! - value;
    solution[row] = value / matrix.get(row, row);
  }
  return solution;
}

export function backwardSubstitution(matrix: Matrix, b: Float64Array): Float64Array {
  const solution = new Float64Array(matrix.rows).fill(0);
  for (let row = matrix.rows - 1; row >= 0; row--) {
    let value = 0;
    for (let col = matrix.cols - 1; col > row; col--) {
      value = value + solution[col]! * matrix.get(row, col);
    }
    value = b[row]! - value;
    solution[row] = value / matrix.get(row, row);
  }
  return solution;
}

interface LUDecomposition {
  l: Matrix;
  u: Matrix;
  p: Float64Array;
}

export function lowerUpperDecomposition(matrix: Matrix): LUDecomposition {
  if (matrix.rows != matrix.cols) {
    throw new Error(`The matrix must be square: ${matrix.getDimension().join(',')}`);
  }
  const size: number = matrix.cols;
  const lu: Matrix = matrix.copy();

  const p = new Float64Array(size).fill(0);

  for (let row = 0; row < size; row++) {
    p[row] = row;
  }

  for (let col = 0; col < size; col++) {
    for (let row = 0; row < col; row++) {
      const luRow: Float64Array = lu.getRow(row);
      let sum: number = luRow[col]!;
      for (let i = 0; i < row; i++) {
        sum -= luRow[i]! * lu.get(i, col);
      }
      luRow[col] = sum;
    }

    let max: number = col;
    let largest = Number.NEGATIVE_INFINITY;
    for (let row = col; row < size; row++) {
      const luRow: Float64Array = lu.getRow(row);
      let sum = luRow[col]!;
      for (let i = 0; i < col; i++) {
        sum -= luRow[i]! * lu.get(i, col);
      }
      luRow[col] = sum!;

      if (Math.abs(sum) > largest) {
        largest = Math.abs(sum);
        max = row;
      }
    }

    if (Math.abs(lu.get(max, col)) < SINGULARITY_THRESHOLD) {
      throw new Error('The matrix is singular');
    }

    if (max != col) {
      const luMax: Float64Array = lu.getRow(max);
      const luCol: Float64Array = lu.getRow(col);
      for (let i = 0; i < size; i++) {
        const tmp = luMax[i];
        luMax[i] = luCol[i]!;
        luCol[i] = tmp!;
      }
      const tmp = p[max];
      p[max] = p[col]!;
      p[col] = tmp!;
    }

    const luDiag: number = lu.get(col, col);
    for (let row = col + 1; row < size; row++) {
      lu.set(row, col, lu.get(row, col) / luDiag);
    }
  }

  const l = Matrix.zeros(size, size);
  for (let i = 0; i < size; ++i) {
    const luI: Float64Array = lu.getRow(i);
    for (let j = 0; j < i; ++j) {
      l.set(i, j, luI[j]!);
    }
    l.set(i, i, 1);
  }

  const u = Matrix.zeros(size, size);
  for (let i = 0; i < size; ++i) {
    const luI: Float64Array = lu.getRow(i);
    for (let j = i; j < size; ++j) {
      u.set(i, j, luI[j]!);
    }
  }

  return {l, u, p};
}

export class Matrix {
  private constructor(
    private readonly elements: Float64Array,
    public readonly rows: number,
    public readonly cols: number
  ) {}

  static fromRows(elements: (number[] | TypedArray)[]): Matrix {
    const rows = elements.length;
    const cols = elements[0]!.length;
    const matrix = Matrix.zeros(rows, cols);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        matrix.set(row, col, elements[row]![col]!);
      }
    }
    return matrix;
  }

  static fromColumn(elements: number[] | TypedArray) {
    const rows = elements.length;
    const cols = 1;
    const matrix = Matrix.zeros(rows, cols);
    for (let i = 0; i < rows; i++) {
      matrix.set(i, 0, elements[i]!);
    }
    return matrix;
  }

  static fromValue(value: number, rows: number, cols: number) {
    return new Matrix(new Float64Array(rows * cols).fill(value), rows, cols);
  }

  static zeros(rows: number, cols: number) {
    return Matrix.fromValue(0, rows, cols);
  }

  static ones(rows: number, cols: number) {
    return Matrix.fromValue(1, rows, cols);
  }

  static identity(size: number) {
    const identity = Matrix.zeros(size, size);
    for (let i = 0; i < size; i++) {
      identity.set(i, i, 1);
    }
    return identity;
  }

  static diag(diagonal: Float64Array): Matrix {
    const n = diagonal.length;
    const diag = Matrix.zeros(n, n);
    for (let i = 0; i < n; i++) {
      diag.set(i, i, diagonal[i]!);
    }
    return diag;
  }

  static tridiag(size: number, a: number, b: number, c: number): Matrix {
    const tridiag = Matrix.zeros(size, size);
    for (let i = 0; i < size; i++) {
      if (i < size - 1) {
        tridiag.set(i + 1, i, a);
      }
      tridiag.set(i, i, b);
      if (i > 0) {
        tridiag.set(i - 1, i, c);
      }
    }
    return tridiag;
  }

  get(row: number, col: number): number {
    return this.elements[row * this.cols + col]!;
  }

  set(row: number, col: number, element: number) {
    this.elements[row * this.cols + col] = element;
  }

  getRow(row: number): Float64Array {
    const start = row * this.cols;
    return this.elements.subarray(start, start + this.cols);
  }

  getRows(start: number, end: number): Matrix {
    return new Matrix(
      this.elements.slice(start * this.cols, end * this.cols),
      end - start,
      this.cols
    );
  }

  getDimension(): [number, number] {
    return [this.rows, this.cols];
  }

  flatten(): Float64Array {
    return this.elements;
  }

  copy(): Matrix {
    return new Matrix(this.elements.slice(), this.rows, this.cols);
  }

  forEach(fn: (element: number, row: number, col: number) => void): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        fn(this.get(row, col), row, col);
      }
    }
  }

  map(fn: (element: number, row: number, col: number) => number): Matrix {
    const result = Matrix.zeros(this.rows, this.cols);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        result.set(row, col, fn(this.get(row, col), row, col));
      }
    }
    return result;
  }

  all(predicate: (element: number, row: number, col: number) => boolean): boolean {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (!predicate(this.get(row, col), row, col)) {
          return false;
        }
      }
    }
    return true;
  }

  concatRows(matrix: Matrix): Matrix {
    if (this.cols != matrix.cols) {
      throw new Error(
        `The number of columns in the matrices must be equal: ${this.getDimension().join(',')}, ${matrix.getDimension().join(',')}`
      );
    }
    const concatenated = new Float64Array(this.elements.length + matrix.elements.length);
    concatenated.set(this.elements);
    concatenated.set(matrix.elements, this.elements.length);
    return new Matrix(concatenated, this.rows + matrix.rows, this.cols);
  }

  concatColumns(matrix: Matrix): Matrix {
    if (this.rows != matrix.rows) {
      throw new Error(
        `The number of rows in the matrices must be equal: ${this.getDimension().join(',')}, ${matrix.getDimension().join(',')}`
      );
    }

    const concatenatedCols = this.cols + matrix.cols;
    const concatenated = new Float64Array(this.rows * concatenatedCols);
    for (let row = 0; row < this.rows; row++) {
      concatenated.set(
        this.elements.subarray(row * this.cols, (row + 1) * this.cols),
        row * concatenatedCols
      );
      concatenated.set(
        matrix.elements.subarray(row * matrix.cols, (row + 1) * matrix.cols),
        row * concatenatedCols + this.cols
      );
    }
    return new Matrix(concatenated, this.rows, concatenatedCols);
  }

  addScalar(addend: number): Matrix {
    return this.map((element: number): number => element + addend);
  }

  multiplyByScalar(multiplier: number): Matrix {
    return this.map((element: number): number => element * multiplier);
  }

  mergeWith(matrix: Matrix, fn: (a: number, b: number) => number): Matrix {
    if (this.rows != matrix.rows || this.cols != matrix.cols) {
      throw new Error(
        `The dimensions of the matrices must be equal: ${this.getDimension().join(',')}, ${matrix.getDimension().join(',')}`
      );
    }
    const result = Matrix.zeros(this.rows, this.cols);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        result.set(row, col, fn(this.get(row, col), matrix.get(row, col)));
      }
    }
    return result;
  }

  add(matrix: Matrix): Matrix {
    return this.mergeWith(matrix, (a: number, b: number): number => a + b);
  }

  subtract(matrix: Matrix): Matrix {
    return this.mergeWith(matrix, (a: number, b: number): number => a - b);
  }

  dotMultiply(matrix: Matrix): Matrix {
    return this.mergeWith(matrix, (a: number, b: number): number => a * b);
  }

  multiply(matrix: Matrix): Matrix {
    if (this.cols != matrix.rows) {
      throw new Error(
        `The number of columns in the first matrix must be equal to the number of rows in the second matrix: ${this.getDimension().join(',')}, ${matrix.getDimension().join(',')}`
      );
    }
    const result = Matrix.zeros(this.rows, matrix.cols);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < matrix.cols; col++) {
        let sum = 0;
        for (let k = 0; k < matrix.rows; k++) {
          sum += this.get(row, k) * matrix.get(k, col);
        }
        result.set(row, col, sum);
      }
    }
    return result;
  }

  transpose(): Matrix {
    const t = Matrix.zeros(this.cols, this.rows);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        t.set(j, i, this.get(i, j));
      }
    }
    return t;
  }

  inverse(): Matrix {
    if (this.rows != this.cols) {
      throw new Error(`The matrix must be square: ${this.getDimension().join(',')}`);
    }
    const {l, u, p} = lowerUpperDecomposition(this);
    const i: Matrix = Matrix.identity(this.rows);
    const inv = Matrix.zeros(this.rows, this.cols);
    for (let row = 0; row < this.rows; row++) {
      const y: Float64Array = forwardSubstitution(l, i.getRow(row));
      const x: Float64Array = backwardSubstitution(u, y);
      for (let col = 0; col < x.length; col++) {
        inv.set(col, p[row]!, x[col]!);
      }
    }
    return inv;
  }
}
