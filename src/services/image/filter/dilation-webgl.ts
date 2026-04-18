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

import type {KernelSize} from '~/src/services/image/filter/types';
import type {RenderPass} from '~/src/services/image/filter/webgl-renderer';
import {WebGLRenderer} from '~/src/services/image/filter/webgl-renderer';
import type {DrawImageSource} from '~/src/utils/graphics';
import {copyOffscreenCanvas} from '~/src/utils/graphics';
import type {Size} from '~/src/utils/types';

import fragmentShaderSource from './glsl/dilation.glsl';

export function dilationWebGL(image: DrawImageSource, kernelSize: KernelSize): OffscreenCanvas {
  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [['u_texelSize', 'u_kernelSize', 'u_direction']],
    image
  );
  const {width, height} = image;
  const texelSize: Size = [1.0 / width, 1.0 / height];
  renderer.render(dilationRenderPasses(texelSize, kernelSize));
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return result;
}

export function dilationRenderPasses(
  texelSize: Size,
  kernelSize: KernelSize,
  programIndex = 0
): RenderPass[] {
  return [
    {
      programIndex,
      setUniforms(gl, locations) {
        setUniforms(gl, locations, texelSize, kernelSize, [1.0, 0.0]);
      },
    },
    {
      programIndex,
      setUniforms(gl, locations) {
        setUniforms(gl, locations, texelSize, kernelSize, [0.0, 1.0]);
      },
    },
  ];
}

function setUniforms(
  gl: WebGL2RenderingContext,
  locations: Map<string, WebGLUniformLocation | null>,
  texelSize: Size,
  kernelSize: KernelSize,
  direction: Size
) {
  gl.uniform2f(locations.get('u_texelSize')!, ...texelSize);
  gl.uniform1i(locations.get('u_kernelSize')!, kernelSize);
  gl.uniform2f(locations.get('u_direction')!, ...direction);
}
