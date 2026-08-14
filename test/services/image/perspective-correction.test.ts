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

import type {Matrix} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it, vi} from 'vitest';

import {calculateDestSize, computeHomography} from '@/services/image/perspective-correction';
import {Vector} from '@/services/math/geometry';

vi.mock('@/services/image/filter/perspective-correction-webgl', () => ({
  correctPerspectiveWebGL: vi.fn(),
}));

vi.mock('@/services/image/heatmap-corner-detection', () => ({
  detectDocumentCornersHeatmap: vi.fn(),
}));

vi.mock('@/services/image/sobel-corner-detection', () => ({
  detectDocumentCornersSobel: vi.fn(),
}));

function transform(matrix: Matrix, {x, y}: Vector): Vector {
  const scale = matrix.get(2, 0) * x + matrix.get(2, 1) * y + matrix.get(2, 2);
  return new Vector(
    (matrix.get(0, 0) * x + matrix.get(0, 1) * y + matrix.get(0, 2)) / scale,
    (matrix.get(1, 0) * x + matrix.get(1, 1) * y + matrix.get(1, 2)) / scale
  );
}

describe('perspective geometry', () => {
  it('calculates the averaged destination dimensions', () => {
    expect(
      calculateDestSize([new Vector(0, 0), new Vector(10, 0), new Vector(12, 6), new Vector(0, 4)])
    ).toEqual([11, 5]);
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
