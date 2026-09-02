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

import {describe, expect, it} from 'vitest';

import {
  inpaintingPatchRectangle,
  inpaintingWindowSquare,
  polygonPatchRectangle,
} from '@/services/image/inpainting-patch';
import {Rectangle, Vector} from '@/services/math/geometry';

describe('inpainting patch', () => {
  const bounds = new Rectangle(new Vector(240, 140));

  it('grows the mask by the blend padding and clamps it to the bounds', () => {
    expect(inpaintingPatchRectangle(Rectangle.fromTopLeft(Vector.ZERO, 240, 20), bounds)).toEqual(
      Rectangle.fromTopLeft(Vector.ZERO, 240, 52)
    );
    expect(
      inpaintingPatchRectangle(Rectangle.fromTopLeft(new Vector(0, 20), 20, 120), bounds)
    ).toEqual(Rectangle.fromTopLeft(Vector.ZERO, 52, 140));
  });

  it('rounds a fractional mask outward', () => {
    expect(
      inpaintingPatchRectangle(
        new Rectangle(new Vector(100.5, 80.5), new Vector(40.5, 50.5)),
        bounds
      )
    ).toEqual(new Rectangle(new Vector(133, 113), new Vector(8, 18)));
  });

  it('patches the bounding box of the polygon, clamped to the image', () => {
    const vertices = [new Vector(10.5, 20.5), new Vector(90.5, 20.5), new Vector(90.5, 80.5)];

    expect(polygonPatchRectangle(vertices, {width: 100, height: 100} as ImageBitmap)).toEqual(
      new Rectangle(new Vector(100, 100), Vector.ZERO)
    );
  });

  it('centers a square window on the patch and translates it inside the bounds', () => {
    const largeBounds = new Rectangle(new Vector(1000, 800));

    expect(
      inpaintingWindowSquare(
        Rectangle.fromTopLeft(new Vector(368, 268), 164, 164),
        largeBounds,
        512
      )
    ).toEqual(Rectangle.fromTopLeft(new Vector(194, 94), 512, 512));
    expect(
      inpaintingWindowSquare(Rectangle.fromTopLeft(new Vector(0, 0), 164, 164), largeBounds, 512)
    ).toEqual(Rectangle.fromTopLeft(Vector.ZERO, 512, 512));
  });

  it('returns null when a square window does not fit inside the bounds', () => {
    expect(
      inpaintingWindowSquare(Rectangle.fromTopLeft(Vector.ZERO, 40, 40), bounds, 512)
    ).toBeNull();
  });
});
