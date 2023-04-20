/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export class Vector {
  static ZERO = new Vector(0, 0);

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
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }
}

export class Rectangle {
  static ZERO = new Rectangle(Vector.ZERO);

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
