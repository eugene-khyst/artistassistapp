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

import {gaussianBlurRenderPasses} from '@/services/image/filter/gaussian-blur-webgl';
import type {KernelSize} from '@/services/image/filter/types';
import {type RenderPass, WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '@/utils/graphics';

import gaussianBlurFragmentShaderSource from './glsl/gaussian-blur.glsl';
import unsharpMaskFragmentShaderSource from './glsl/unsharp-mask.glsl';

export function unsharpMaskWebGL(
  image: OffscreenCanvas,
  kernelSize: KernelSize,
  standardDeviation: number,
  amount: number,
  threshold: number
): OffscreenCanvas {
  const renderer = new WebGLRenderer(
    [gaussianBlurFragmentShaderSource, unsharpMaskFragmentShaderSource],
    [
      ['u_kernel', 'u_kernelSize', 'u_direction'],
      ['u_original', 'u_amount', 'u_threshold'],
    ],
    image,
    {premultiplyAlpha: true}
  );
  const renderPasses: RenderPass[] = [
    ...gaussianBlurRenderPasses(kernelSize, 0, standardDeviation),
    {
      programIndex: 1,
      textures: [{name: 'u_original', source: image}],
      setUniforms(gl, locations) {
        gl.uniform1f(locations.get('u_amount')!, amount);
        gl.uniform1f(locations.get('u_threshold')!, threshold);
      },
    },
  ];
  try {
    renderer.render(renderPasses);
    return copyOffscreenCanvas(renderer.canvas);
  } finally {
    renderer.cleanUp();
  }
}
