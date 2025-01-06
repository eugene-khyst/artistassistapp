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

import {WebGLRenderer} from '~/src/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '~/src/utils';

import fragmentShaderSource from './glsl/threshold.glsl';

export const THRESHOLD_VALUES: number[] = [2 / 3, 1 / 3, 0];

export function thresholdFilterWebGL(image: ImageBitmap, thresholds: number[]): ImageBitmap[] {
  const renderer = new WebGLRenderer(fragmentShaderSource, image);
  const {canvas, gl, program} = renderer;

  const thresholdsLocation = gl.getUniformLocation(program, 'u_thresholds');
  const colorsLocation = gl.getUniformLocation(program, 'u_values');
  const toneLocation = gl.getUniformLocation(program, 'u_tone');
  gl.uniform1fv(thresholdsLocation, new Float32Array(thresholds));
  gl.uniform1fv(colorsLocation, new Float32Array(THRESHOLD_VALUES));

  const resultImages = thresholds.map((_, i) => {
    gl.uniform1i(toneLocation, i);
    renderer.clear();
    renderer.draw();
    return copyOffscreenCanvas(canvas).transferToImageBitmap();
  });
  renderer.cleanUp();
  return resultImages;
}
