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

import {type Matrix} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it, vi} from 'vitest';

import {
  calculateDestSize,
  computeHomography,
  Polygon,
  Rectangle,
  Vector,
} from '@/services/math/geometry';

function transform(matrix: Matrix, {x, y}: Vector): Vector {
  const scale = matrix.get(2, 0) * x + matrix.get(2, 1) * y + matrix.get(2, 2);
  return new Vector(
    (matrix.get(0, 0) * x + matrix.get(0, 1) * y + matrix.get(0, 2)) / scale,
    (matrix.get(1, 0) * x + matrix.get(1, 1) * y + matrix.get(1, 2)) / scale
  );
}

describe('geometry', () => {
  it('calculates the vector angle', () => {
    expect(new Vector(0, -1).angle()).toBeCloseTo(-Math.PI / 2);
    expect(new Vector(1, 0).angle()).toBe(0);
  });

  it('orders polygon vertices clockwise in canvas coordinates', () => {
    const vertices = [new Vector(0, 1), new Vector(1, 2), new Vector(1, 0), new Vector(2, 1)];

    const sorted = new Polygon(vertices).sortVertices();

    expect(sorted.vertices).toEqual([
      new Vector(1, 0),
      new Vector(2, 1),
      new Vector(1, 2),
      new Vector(0, 1),
    ]);
    expect(vertices).toEqual([
      new Vector(0, 1),
      new Vector(1, 2),
      new Vector(1, 0),
      new Vector(2, 1),
    ]);
  });

  it('bounds the polygon vertices', () => {
    const polygon = new Polygon([new Vector(30, 10), new Vector(10, 40), new Vector(50, 20)]);

    expect(polygon.getBoundingBox()).toEqual(new Rectangle(new Vector(50, 40), new Vector(10, 10)));
  });

  it('grows the rectangle in every direction', () => {
    const grown = new Rectangle(new Vector(50, 40), new Vector(10, 10)).grow(5);

    expect(grown).toEqual(new Rectangle(new Vector(55, 45), new Vector(5, 5)));
    expect(grown.width).toBe(50);
    expect(grown.height).toBe(40);
  });

  it('grows a fractional rectangle to integers', () => {
    const rectangle = new Rectangle(new Vector(50.1, 40.9), new Vector(10.9, 10.1));

    expect(rectangle.growToIntegers()).toEqual(
      new Rectangle(new Vector(51, 41), new Vector(10, 10))
    );
  });

  it('compares rectangles by size only', () => {
    const rectangle = new Rectangle(new Vector(30, 25), new Vector(10, 5));

    expect(rectangle.sameSize(new Rectangle(new Vector(20, 20)))).toBe(true);
    expect(rectangle.sameSize(new Rectangle(new Vector(20, 21)))).toBe(false);
  });

  it('intersects overlapping rectangles', () => {
    const first = new Rectangle(new Vector(50, 40), new Vector(10, 10));
    const second = new Rectangle(new Vector(60, 50), new Vector(30, 20));

    expect(first.intersect(second)).toEqual(new Rectangle(new Vector(50, 40), new Vector(30, 20)));
    expect(first.intersect(new Rectangle(new Vector(40, 30), new Vector(20, 15)))).toEqual(
      new Rectangle(new Vector(40, 30), new Vector(20, 15))
    );
  });

  it('returns null when rectangles do not overlap with positive area', () => {
    const rectangle = new Rectangle(new Vector(20, 20), new Vector(10, 10));

    expect(rectangle.intersect(new Rectangle(new Vector(40, 40), new Vector(30, 30)))).toBeNull();
    expect(rectangle.intersect(new Rectangle(new Vector(30, 20), new Vector(20, 10)))).toBeNull();
  });

  it('translates a rectangle inside the bounds without changing its size', () => {
    const bounds = new Rectangle(new Vector(110, 100), new Vector(10, 20));

    expect(new Rectangle(new Vector(80, 70), new Vector(30, 40)).translateInside(bounds)).toEqual(
      new Rectangle(new Vector(80, 70), new Vector(30, 40))
    );
    expect(new Rectangle(new Vector(40, 50), Vector.ZERO).translateInside(bounds)).toEqual(
      new Rectangle(new Vector(50, 70), new Vector(10, 20))
    );
    expect(new Rectangle(new Vector(130, 120), new Vector(90, 90)).translateInside(bounds)).toEqual(
      new Rectangle(new Vector(110, 100), new Vector(70, 70))
    );
  });

  it('returns null when a rectangle is too large to translate inside the bounds', () => {
    const bounds = new Rectangle(new Vector(100, 80));

    expect(new Rectangle(new Vector(101, 40)).translateInside(bounds)).toBeNull();
    expect(new Rectangle(new Vector(40, 81)).translateInside(bounds)).toBeNull();
  });

  it('calculates the averaged destination dimensions', () => {
    expect(
      calculateDestSize([new Vector(0, 0), new Vector(10, 0), new Vector(12, 6), new Vector(0, 4)])
    ).toEqual(new Rectangle(new Vector(11, 5)));
  });

  it('computes a homography that maps all four source corners', () => {
    const source = [new Vector(0, 0), new Vector(2, 0), new Vector(2, 1), new Vector(0, 1)];
    const destination = [
      new Vector(10, 20),
      new Vector(30, 20),
      new Vector(30, 40),
      new Vector(10, 40),
    ];

    const homography = computeHomography(source, destination);

    expect(homography).not.toBeNull();
    for (const [index, point] of source.entries()) {
      const mapped = transform(homography!, point);
      expect(mapped.x).toBeCloseTo(destination[index]!.x, 10);
      expect(mapped.y).toBeCloseTo(destination[index]!.y, 10);
    }
  });

  it('returns null for degenerate corner sets', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(
        computeHomography(
          [new Vector(0, 0), new Vector(1, 0), new Vector(2, 0), new Vector(3, 0)],
          [new Vector(0, 0), new Vector(1, 0), new Vector(1, 1), new Vector(0, 1)]
        )
      ).toBeNull();
    } finally {
      errorSpy.mockRestore();
    }
  });
});
