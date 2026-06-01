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

import {WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {calculateDestSize, computeHomography} from '@/services/image/perspective-correction';
import {Vector} from '@/services/math/geometry';
import {orderCornersClockwise} from '@/services/math/geometry';
import type {DrawImageSource} from '@/utils/graphics';
import {copyOffscreenCanvas} from '@/utils/graphics';
import type {Size} from '@/utils/types';

import fragmentShaderSource from './glsl/perspective-correction.glsl';

export function correctPerspectiveWebGL(
  image: DrawImageSource,
  vertices: Vector[]
): OffscreenCanvas {
  const sortedVertices = orderCornersClockwise(vertices);
  const destSize: Size = calculateDestSize(sortedVertices);
  const [destWidth, destHeight] = destSize;
  const destVertices = [
    new Vector(0, 0),
    new Vector(destWidth, 0),
    new Vector(destWidth, destHeight),
    new Vector(0, destHeight),
  ];

  const H = computeHomography(sortedVertices, destVertices);
  if (!H) {
    throw new Error('Could not compute transformation');
  }
  const Hinv = H.inverse();

  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [['u_inverse_homography', 'u_src_dimensions', 'u_dest_dimensions']],
    image,
    destSize
  );
  renderer.render([
    {
      setUniforms(gl, locations) {
        gl.uniformMatrix3fv(locations.get('u_inverse_homography')!, true, Hinv.elements);
        gl.uniform2f(locations.get('u_src_dimensions')!, image.width, image.height);
        gl.uniform2f(locations.get('u_dest_dimensions')!, destWidth, destHeight);
      },
    },
  ]);
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return result;
}
