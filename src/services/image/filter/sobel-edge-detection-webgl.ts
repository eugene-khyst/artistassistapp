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

import {dilationRenderPasses} from '@/services/image/filter/dilation-webgl';
import {gaussianBlurRenderPasses} from '@/services/image/filter/gaussian-blur-webgl';
import type {KernelSize} from '@/services/image/filter/types';
import {type RenderPass, WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas, type DrawImageSource} from '@/utils/graphics';

import dilationFragmentShaderSource from './glsl/dilation.glsl';
import gaussianBlurFragmentShaderSource from './glsl/gaussian-blur.glsl';
import sobelOperatorFragmentShaderSource from './glsl/sobel-operator.glsl';

export interface SobelParams {
  gaussianBlurKernelSize?: KernelSize;
  dilationKernelSize?: KernelSize;
}

export function sobelEdgeDetectionWebGL(
  image: DrawImageSource,
  {gaussianBlurKernelSize = 5, dilationKernelSize = 3}: SobelParams = {}
): OffscreenCanvas {
  const renderer = new WebGLRenderer(
    [
      gaussianBlurFragmentShaderSource,
      sobelOperatorFragmentShaderSource,
      dilationFragmentShaderSource,
    ],
    [['u_kernel', 'u_kernelSize', 'u_direction'], [], ['u_kernelSize', 'u_direction']],
    image
  );
  const renderPasses: RenderPass[] = [
    ...gaussianBlurRenderPasses(gaussianBlurKernelSize, 0),
    {programIndex: 1},
    ...dilationRenderPasses(dilationKernelSize, 2),
  ];
  renderer.render(renderPasses);
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return result;
}
