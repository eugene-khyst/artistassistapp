/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {type Comparator, Matrix} from '@eugene-khyst/artistassistapp-color-mixer';

import {LengthUnit, type LengthUnitDefinition} from '@/services/math/types';
import type {Size} from '@/utils/types';

export const LENGTH_UNITS = new Map<LengthUnit, LengthUnitDefinition>([
  [LengthUnit.Millimeter, {abbreviation: 'mm', toMillimeters: number => number}],
  [LengthUnit.Centimeter, {abbreviation: 'cm', toMillimeters: number => 10 * number}],
  [LengthUnit.Inch, {abbreviation: 'in', toMillimeters: number => 25.4 * number}],
]);

export class Vector {
  static readonly ZERO = new Vector(0, 0);

  constructor(
    public readonly x: number,
    public readonly y: number
  ) {}

  add({x, y}: Vector): Vector {
    return new Vector(this.x + x, this.y + y);
  }

  subtract({x, y}: Vector): Vector {
    return new Vector(this.x - x, this.y - y);
  }

  multiply(n: number): Vector {
    return new Vector(this.x * n, this.y * n);
  }

  divide(n: number): Vector {
    return new Vector(this.x / n, this.y / n);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }
}

export class Rectangle {
  static readonly ZERO = new Rectangle(Vector.ZERO);

  readonly width: number;
  readonly height: number;
  readonly center: Vector;

  constructor(
    public readonly bottomRight: Vector,
    public readonly topLeft = Vector.ZERO
  ) {
    this.width = bottomRight.x - topLeft.x;
    this.height = bottomRight.y - topLeft.y;
    this.center = new Vector((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
  }

  static fromTopLeft(topLeft: Vector, width: number, height: number): Rectangle {
    return new Rectangle(topLeft.add(new Vector(width, height)), topLeft);
  }

  contains({x, y}: Vector, shrinkBy = 0): boolean {
    return (
      x >= this.topLeft.x + shrinkBy &&
      y >= this.topLeft.y + shrinkBy &&
      x <= this.bottomRight.x - shrinkBy &&
      y <= this.bottomRight.y - shrinkBy
    );
  }

  grow(padding: number): Rectangle {
    const offset = new Vector(padding, padding);
    return new Rectangle(this.bottomRight.add(offset), this.topLeft.subtract(offset));
  }

  growToIntegers(): Rectangle {
    return new Rectangle(
      new Vector(Math.ceil(this.bottomRight.x), Math.ceil(this.bottomRight.y)),
      new Vector(Math.floor(this.topLeft.x), Math.floor(this.topLeft.y))
    );
  }

  sameSize({width, height}: Rectangle): boolean {
    return this.width === width && this.height === height;
  }

  intersect(other: Rectangle): Rectangle | null {
    const topLeft = new Vector(
      Math.max(this.topLeft.x, other.topLeft.x),
      Math.max(this.topLeft.y, other.topLeft.y)
    );
    const bottomRight = new Vector(
      Math.min(this.bottomRight.x, other.bottomRight.x),
      Math.min(this.bottomRight.y, other.bottomRight.y)
    );
    return bottomRight.x > topLeft.x && bottomRight.y > topLeft.y
      ? new Rectangle(bottomRight, topLeft)
      : null;
  }

  translateInside(bounds: Rectangle): Rectangle | null {
    if (this.width > bounds.width || this.height > bounds.height) {
      return null;
    }
    const maxTopLeft = bounds.bottomRight.subtract(new Vector(this.width, this.height));
    const topLeft = new Vector(
      Math.max(bounds.topLeft.x, Math.min(this.topLeft.x, maxTopLeft.x)),
      Math.max(bounds.topLeft.y, Math.min(this.topLeft.y, maxTopLeft.y))
    );
    return new Rectangle(this.bottomRight.add(topLeft.subtract(this.topLeft)), topLeft);
  }
}

export class Polygon {
  constructor(readonly vertices: readonly Vector[]) {}

  sortVertices(): Polygon {
    const center = this.vertices
      .reduce((sum, vertex) => sum.add(vertex), Vector.ZERO)
      .divide(this.vertices.length);
    return new Polygon(
      [...this.vertices].sort((a, b) => a.subtract(center).angle() - b.subtract(center).angle())
    );
  }

  getBoundingBox(): Rectangle {
    const xs = this.vertices.map(({x}) => x);
    const ys = this.vertices.map(({y}) => y);
    return new Rectangle(
      new Vector(Math.max(...xs), Math.max(...ys)),
      new Vector(Math.min(...xs), Math.min(...ys))
    );
  }
}

export const compareByX: Comparator<Vector> = (a: Vector, b: Vector) => a.x - b.x;
export const compareByY: Comparator<Vector> = (a: Vector, b: Vector) => a.y - b.y;

export function orderCornersClockwise(vertices: Vector[]): Vector[] {
  const sortedByY = [...vertices].sort(compareByY);
  const [topLeft, topRight] = sortedByY.slice(0, 2).sort(compareByX);
  const [bottomLeft, bottomRight] = sortedByY.slice(2, 4).sort(compareByX);
  return [topLeft, topRight, bottomRight, bottomLeft].filter((value): value is Vector => !!value);
}

export function calculateDestSize(vertices: Vector[]): Size {
  if (vertices.length !== 4) {
    throw new Error('Incorrect number of vertices');
  }
  const [topLeft, topRight, bottomRight, bottomLeft] = vertices;
  const topWidth = topLeft!.subtract(topRight!).length();
  const bottomWidth = bottomLeft!.subtract(bottomRight!).length();
  const leftHeight = topLeft!.subtract(bottomLeft!).length();
  const rightHeight = topRight!.subtract(bottomRight!).length();
  const width = Math.round((topWidth + bottomWidth) / 2);
  const height = Math.round((leftHeight + rightHeight) / 2);
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid vertices');
  }
  return [width, height];
}

export function computeHomography(src: Vector[], dest: Vector[]): Matrix | null {
  const A = Matrix.zeros(8, 8);
  const b = Matrix.zeros(8, 1);
  for (let i = 0; i < 4; i++) {
    const {x: srcX, y: srcY} = src[i]!;
    const {x: destX, y: destY} = dest[i]!;
    A.set(2 * i, 0, srcX);
    A.set(2 * i, 1, srcY);
    A.set(2 * i, 2, 1);
    A.set(2 * i, 6, -srcX * destX);
    A.set(2 * i, 7, -srcY * destX);
    b.set(2 * i, 0, destX);
    A.set(2 * i + 1, 3, srcX);
    A.set(2 * i + 1, 4, srcY);
    A.set(2 * i + 1, 5, 1);
    A.set(2 * i + 1, 6, -srcX * destY);
    A.set(2 * i + 1, 7, -srcY * destY);
    b.set(2 * i + 1, 0, destY);
  }
  try {
    const h = A.inverse().multiply(b);
    return Matrix.fromRows([
      [h.get(0, 0), h.get(1, 0), h.get(2, 0)],
      [h.get(3, 0), h.get(4, 0), h.get(5, 0)],
      [h.get(6, 0), h.get(7, 0), 1],
    ]);
  } catch (e) {
    console.error(e);
    return null;
  }
}
