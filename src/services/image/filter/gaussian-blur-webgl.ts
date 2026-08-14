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

import type {KernelSize} from '@/services/image/filter/types';
import {type RenderPass, WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas, type DrawImageSource} from '@/utils/graphics';
import type {Size} from '@/utils/types';

import fragmentShaderSource from './glsl/gaussian-blur.glsl';

export function gaussianBlurWebGL(image: DrawImageSource, kernelSize: KernelSize): OffscreenCanvas {
  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [['u_kernel', 'u_kernelSize', 'u_direction']],
    image
  );
  renderer.render(gaussianBlurRenderPasses(kernelSize));
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return result;
}

export function gaussianBlurRenderPasses(kernelSize: KernelSize, programIndex = 0): RenderPass[] {
  const kernel = createGaussianKernel(kernelSize);
  return [
    {
      programIndex,
      setUniforms(gl, locations) {
        setUniforms(gl, locations, kernel, [1.0, 0.0]);
      },
    },
    {
      programIndex,
      setUniforms(gl, locations) {
        setUniforms(gl, locations, kernel, [0.0, 1.0]);
      },
    },
  ];
}

function setUniforms(
  gl: WebGL2RenderingContext,
  locations: Map<string, WebGLUniformLocation | null>,
  kernel: Float32Array,
  direction: Size
) {
  gl.uniform1fv(locations.get('u_kernel')!, kernel);
  gl.uniform1i(locations.get('u_kernelSize')!, kernel.length);
  gl.uniform2f(locations.get('u_direction')!, ...direction);
}

function createGaussianKernel(size: KernelSize): Float32Array {
  const radius = (size - 1) / 2;
  const sigma = 0.3 * (radius - 1) + 0.8;
  const kernel = new Float32Array(size);
  const twoSigmaSquare = 2 * sigma ** 2;
  let sum = 0;
  let i = 0;
  for (let x = -radius; x <= radius; x++) {
    const weight = Math.exp(-(x ** 2) / twoSigmaSquare);
    kernel[i] = weight;
    sum += weight;
    i++;
  }
  for (let i = 0; i < kernel.length; i++) {
    kernel[i]! /= sum;
  }
  return kernel;
}
