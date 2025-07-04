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

import {correctPerspectiveWebGL} from '~/src/services/image/filter/perspective-correction-webgl';
import {compareByX, compareByY, type Vector} from '~/src/services/math/geometry';
import {Matrix} from '~/src/services/math/matrix';
import type {Size} from '~/src/utils/types';

export function getPerspectiveCorrectionImage(image: ImageBitmap, vertices: Vector[]): ImageBitmap {
  console.time('perspective-correction');
  const perspectiveCorrectedImage: ImageBitmap = correctPerspectiveWebGL(image, vertices);
  console.timeEnd('perspective-correction');
  return perspectiveCorrectedImage;
}

export function sortVertices(vertices: Vector[]): Vector[] {
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
