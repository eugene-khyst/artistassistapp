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
import {Vector} from '@/services/math/geometry';
import type {DrawImageSource} from '@/utils/graphics';
import {copyOffscreenCanvas} from '@/utils/graphics';

import fragmentShaderSource from './glsl/multi-layer-radial-mask.glsl';

const MAX_LAYERS = 10;

export function multiLayerRadialMaskWebGL(
  images: DrawImageSource[],
  radiuses: number[],
  center?: Vector
): OffscreenCanvas {
  if (images.length > MAX_LAYERS) {
    throw new Error(`Up to ${MAX_LAYERS} layers are supported`);
  }
  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [['u_layerCount', 'u_radiuses', 'u_center']],
    images
  );
  const {canvas} = renderer;
  center = center ?? new Vector(canvas.width / 2, canvas.height / 2);
  renderer.render([
    {
      setUniforms(gl, locations) {
        gl.uniform1i(locations.get('u_layerCount')!, images.length);
        gl.uniform1fv(locations.get('u_radiuses')!, new Float32Array(radiuses));
        gl.uniform2f(locations.get('u_center')!, center.x, center.y);
      },
    },
  ]);
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return result;
}
