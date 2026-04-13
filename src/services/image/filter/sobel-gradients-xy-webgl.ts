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

import {WebGLRenderer} from '~/src/services/image/filter/webgl-renderer';
import type {Size} from '~/src/utils/types';

import fragmentShaderSource from './glsl/sobel-gradients-xy.glsl';

export interface SobelGradients {
  gradientX: Uint8Array;
  gradientY: Uint8Array;
  width: number;
  height: number;
}

export function sobelGradientsXyWebGL(image: ImageBitmap | OffscreenCanvas): SobelGradients {
  const renderer = new WebGLRenderer([fragmentShaderSource], [['u_texelSize']], image);
  const {width, height} = image;
  const texelSize: Size = [1.0 / width, 1.0 / height];
  renderer.render(
    [
      {
        programIndex: 0,
        setUniforms(gl, locations) {
          gl.uniform2f(locations.get('u_texelSize')!, ...texelSize);
        },
      },
    ],
    true
  );

  const pixels = renderer.readPixels();
  renderer.cleanUp();

  const gradientX = new Uint8Array(width * height);
  const gradientY = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const srcIndex = (row + x) * 4;
      const dstIndex = row + x;
      gradientX[dstIndex] = pixels[srcIndex]!;
      gradientY[dstIndex] = pixels[srcIndex + 1]!;
    }
  }

  return {gradientX, gradientY, width, height};
}
