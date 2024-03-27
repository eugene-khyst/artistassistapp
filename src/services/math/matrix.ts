/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {create2DArray, createArray} from '~/src/utils';

const SINGULARITY_THRESHOLD = 1e-11;

export function forwardSubstitution(matrix: Matrix, b: number[]): number[] {
  const solution: number[] = createArray(matrix.rows, 0);
  for (let row = 0; row < matrix.rows; row++) {
    let value = 0;
    for (let col = 0; col < row; col++) {
      value += solution[col] * matrix.get(row, col);
    }
    value = b[row] - value;
    solution[row] = value / matrix.get(row, row);
  }
  return solution;
}

export function backwardSubstitution(matrix: Matrix, b: number[]): number[] {
  const solution: number[] = createArray(matrix.rows, 0);
  for (let row = matrix.rows - 1; row >= 0; row--) {
    let value = 0;
    for (let col = matrix.cols - 1; col > row; col--) {
      value = value + solution[col] * matrix.get(row, col);
    }
    value = b[row] - value;
    solution[row] = value / matrix.get(row, row);
  }
  return solution;
}

export function lowerUpperDecomposition(matrix: Matrix): {l: Matrix; u: Matrix; p: number[]} {
  if (matrix.rows != matrix.cols) {
    throw new Error(`The matrix must be square: ${matrix.getDimension()}`);
  }
  const size: number = matrix.cols;
  const lu: number[][] = matrix.copy().getElements();

  const p: number[] = createArray(size, 0);

  for (let row = 0; row < size; row++) {
    p[row] = row;
  }

  for (let col = 0; col < size; col++) {
    // upper
    for (let row = 0; row < col; row++) {
      const luRow: number[] = lu[row];
      let sum: number = luRow[col];
      for (let i = 0; i < row; i++) {
        sum -= luRow[i] * lu[i][col];
      }
      luRow[col] = sum;
    }

    let max: number = col;
    let largest = Number.NEGATIVE_INFINITY;
    for (let row = col; row < size; row++) {
      const luRow: number[] = lu[row];
      let sum = luRow[col];
      for (let i = 0; i < col; i++) {
        sum -= luRow[i] * lu[i][col];
      }
      luRow[col] = sum;

      if (Math.abs(sum) > largest) {
        largest = Math.abs(sum);
        max = row;
      }
    }

    if (Math.abs(lu[max][col]) < SINGULARITY_THRESHOLD) {
      throw new Error('The matrix is singular');
    }

    if (max != col) {
      const luMax: number[] = lu[max];
      const luCol: number[] = lu[col];
      for (let i = 0; i < size; i++) {
        const tmp = luMax[i];
        luMax[i] = luCol[i];
        luCol[i] = tmp;
      }
      const tmp = p[max];
      p[max] = p[col];
      p[col] = tmp;
    }

    const luDiag: number = lu[col][col];
    for (let row = col + 1; row < size; row++) {
      lu[row][col] /= luDiag;
    }
  }

  const l: number[][] = create2DArray(size, size, 0);
  for (let i = 0; i < size; ++i) {
    const luI: number[] = lu[i];
    for (let j = 0; j < i; ++j) {
      l[i][j] = luI[j];
    }
    l[i][i] = 1;
  }

  const u: number[][] = create2DArray(size, size, 0);
  for (let i = 0; i < size; ++i) {
    const luI: number[] = lu[i];
    for (let j = i; j < size; ++j) {
      u[i][j] = luI[j];
    }
  }

  return {l: new Matrix(l), u: new Matrix(u), p};
}

export class Matrix {
  rows: number;
  cols: number;

  constructor(private elements: number[][]) {
    this.rows = elements.length;
    this.cols = elements[0].length;
  }

  static fromColumns(columns: number[][]) {
    const rows: number = columns[0].length;
    const cols: number = columns.length;
    const elements: number[][] = create2DArray(rows, cols, 0);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        elements[row][col] = columns[col][row];
      }
    }
    return new Matrix(elements);
  }

  static zeros(rows: number, cols: number) {
    return new Matrix(create2DArray(rows, cols, 0));
  }

  static ones(rows: number, cols: number) {
    return new Matrix(create2DArray(rows, cols, 1));
  }

  static identity(size: number) {
    const elements: number[][] = create2DArray(size, size, 0);
    for (let i = 0; i < size; i++) {
      elements[i][i] = 1;
    }
    return new Matrix(elements);
  }

  static diag(diagonal: number[]): Matrix {
    const n = diagonal.length;
    const elements: number[][] = create2DArray(n, n, 0);
    for (let i = 0; i < n; i++) {
      elements[i][i] = diagonal[i];
    }
    return new Matrix(elements);
  }

  static tridiag(size: number, a: number, b: number, c: number): Matrix {
    const tridiag: number[][] = create2DArray(size, size, 0);
    for (let i = 0; i < size; i++) {
      if (i < size - 1) {
        tridiag[i + 1][i] = a;
      }
      tridiag[i][i] = b;
      if (i > 0) {
        tridiag[i - 1][i] = c;
      }
    }
    return new Matrix(tridiag);
  }

  get(row: number, col: number) {
    return this.elements[row][col];
  }

  set(row: number, col: number, element: number) {
    this.elements[row][col] = element;
  }

  getElements(): number[][] {
    return this.elements;
  }

  getRow(row: number): number[] {
    return this.elements[row];
  }

  getRows(start: number, end: number): number[][] {
    return this.elements.slice(start, end);
  }

  getDimension(): [number, number] {
    return [this.rows, this.cols];
  }

  flatten(): number[] {
    return this.getElements().flat();
  }

  copy(): Matrix {
    return new Matrix(
      this.elements.map((rowElements: number[]) => {
        return rowElements.slice();
      })
    );
  }

  forEach(fn: (element: number, row: number, col: number) => void): void {
    this.elements.forEach((rowElements: number[], row: number): void =>
      rowElements.forEach((element: number, col: number): void => fn(element, row, col))
    );
  }

  map(fn: (element: number, row: number, col: number) => number): Matrix {
    return new Matrix(
      this.elements.map((rowElements: number[], row: number): number[] =>
        rowElements.map((element: number, col: number): number => fn(element, row, col))
      )
    );
  }

  concatRows(matrix: Matrix): Matrix {
    if (this.cols != matrix.cols) {
      throw new Error(
        `The number of columns in the matrices must be equal: ${this.getDimension()}, ${matrix.getDimension()}`
      );
    }
    return new Matrix(this.getElements().concat(matrix.getElements()));
  }

  concatColumns(matrix: Matrix): Matrix {
    if (this.rows != matrix.rows) {
      throw new Error(
        `The number of rows in the matrices must be equal: ${this.getDimension()}, ${matrix.getDimension()}`
      );
    }
    const elements: number[][] = [];
    for (let row = 0; row < this.rows; row++) {
      elements.push(this.getRow(row).concat(matrix.getRow(row)));
    }
    return new Matrix(elements);
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
        `The dimensions of the matrices must be equal: ${this.getDimension()}, ${matrix.getDimension()}`
      );
    }
    const result = create2DArray(this.rows, this.cols, 0);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        result[row][col] = fn(this.get(row, col), matrix.get(row, col));
      }
    }
    return new Matrix(result);
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
        `The number of columns in the first matrix must be equal to the number of rows in the second matrix: ${this.getDimension()}, ${matrix.getDimension()}`
      );
    }
    const result = create2DArray(this.rows, matrix.cols, 0);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < matrix.cols; col++) {
        let sum = 0;
        for (let k = 0; k < matrix.rows; k++) {
          sum += this.get(row, k) * matrix.get(k, col);
        }
        result[row][col] = sum;
      }
    }
    return new Matrix(result);
  }

  transpose(): Matrix {
    const t: number[][] = create2DArray(this.cols, this.rows, 0);
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        t[j][i] = this.get(i, j);
      }
    }
    return new Matrix(t);
  }

  inverse(): Matrix {
    if (this.rows != this.cols) {
      throw new Error(`The matrix must be square: ${this.getDimension()}`);
    }
    const {l, u, p}: {l: Matrix; u: Matrix; p: number[]} = lowerUpperDecomposition(this);
    const i: Matrix = Matrix.identity(this.rows);
    const inv: number[][] = create2DArray(this.rows, this.cols, 0);
    for (let row = 0; row < this.rows; row++) {
      const y: number[] = forwardSubstitution(l, i.getRow(row));
      const x: number[] = backwardSubstitution(u, y);
      for (let col = 0; col < x.length; col++) {
        inv[col][p[row]] = x[col];
      }
    }
    return new Matrix(inv);
  }
}
