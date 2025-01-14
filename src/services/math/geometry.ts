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

import type {LengthUnitDefinition} from '~/src/services/math/types';
import {LengthUnit} from '~/src/services/math/types';

export const LENGTH_UNITS = new Map<LengthUnit, LengthUnitDefinition>([
  [LengthUnit.Millimeter, {abbreviation: 'mm', toMillimeters: number => number}],
  [LengthUnit.Centimeter, {abbreviation: 'cm', toMillimeters: number => 10 * number}],
  [LengthUnit.Inch, {abbreviation: 'in', toMillimeters: number => 25.4 * number}],
]);

export class Vector {
  static readonly ZERO = new Vector(0, 0);

  constructor(
    public x: number,
    public y: number
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

  length(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}

export class Rectangle {
  static readonly ZERO = new Rectangle(Vector.ZERO);

  width: number;
  height: number;
  center: Vector;

  constructor(
    public bottomRight: Vector,
    public topLeft = Vector.ZERO
  ) {
    this.width = bottomRight.x - topLeft.x;
    this.height = bottomRight.y - topLeft.y;
    this.center = new Vector((topLeft.x + bottomRight.x) / 2, (topLeft.y + bottomRight.y) / 2);
  }

  contains({x, y}: Vector, shrinkBy = 0): boolean {
    return (
      x >= this.topLeft.x + shrinkBy &&
      y >= this.topLeft.y + shrinkBy &&
      x <= this.bottomRight.x - shrinkBy &&
      y <= this.bottomRight.y - shrinkBy
    );
  }
}

export function radians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function degrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function nonNegativeAngle(angle: number) {
  return angle >= 0 ? angle : angle + 360;
}
