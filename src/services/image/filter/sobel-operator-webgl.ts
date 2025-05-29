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

import {
  gaussianBlurRenderPasses,
  type KernelSize,
} from '~/src/services/image/filter/gaussian-blur-webgl';
import {WebGLRenderer} from '~/src/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '~/src/utils/graphics';
import type {Size} from '~/src/utils/types';

import gaussianBlurFragmentShaderSource from './glsl/gaussian-blur.glsl';
import sobelOperatorFragmentShaderSource from './glsl/sobel-operator.glsl';

export function sobelEdgeDetectionWebGL(
  image: ImageBitmap,
  gaussianBlurKernelSize: KernelSize
): ImageBitmap {
  const renderer = new WebGLRenderer(
    [gaussianBlurFragmentShaderSource, sobelOperatorFragmentShaderSource],
    [['u_texelSize', 'u_kernel', 'u_kernelSize', 'u_direction'], ['u_texelSize']],
    image
  );
  const {width, height} = image;
  const texelSize: Size = [1.0 / width, 1.0 / height];
  renderer.render([
    ...gaussianBlurRenderPasses(texelSize, gaussianBlurKernelSize, 0),
    {
      programIndex: 1,
      setUniforms(gl, locations) {
        gl.uniform2f(locations.get('u_texelSize')!, ...texelSize);
      },
    },
  ]);
  const resultImage = copyOffscreenCanvas(renderer.canvas).transferToImageBitmap();
  renderer.cleanUp();
  return resultImage;
}
