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

import {Polygon, Rectangle, Vector} from '@/services/math/geometry';
import type {DrawImageSource} from '@/utils/graphics';

const INPAINTING_PATCH_PADDING = 32;

export function inpaintingPatchRectangle(
  mask: Rectangle,
  bounds: Rectangle,
  padding = INPAINTING_PATCH_PADDING
): Rectangle {
  return mask.grow(padding).growToIntegers().intersect(bounds)!;
}

export function polygonPatchRectangle(
  vertices: readonly Vector[],
  {width, height}: DrawImageSource
): Rectangle {
  return inpaintingPatchRectangle(
    new Polygon(vertices).getBoundingBox(),
    new Rectangle(new Vector(width, height))
  );
}

export function inpaintingWindowSquare(
  patch: Rectangle,
  bounds: Rectangle,
  side: number
): Rectangle | null {
  const offset = new Vector(side / 2, side / 2);
  const topLeft = patch.center.subtract(offset);
  return Rectangle.fromTopLeft(
    new Vector(Math.round(topLeft.x), Math.round(topLeft.y)),
    side,
    side
  ).translateInside(bounds);
}
