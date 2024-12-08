/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {WebGLShaderRunner} from '~/src/services/image/filter/webgl-runner';

import fragmentShaderSource from './glsl/sobel-operator.glsl';

export function sobelEdgeDetectionWebGL(image: ImageBitmap): ImageBitmap {
  const {width, height} = image;
  const runner = new WebGLShaderRunner(fragmentShaderSource, width, height);
  const {gl, program} = runner;
  runner.createTexture(image);

  const texelSizeLocation = gl.getUniformLocation(program, 'u_texelSize');
  gl.uniform2f(texelSizeLocation, 1.0 / image.width, 1.0 / image.height);

  runner.draw();
  const resultImage = runner.transferToImageBitmap();
  runner.cleanUp();
  return resultImage;
}
