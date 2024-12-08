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

import {THRESHOLD_VALUES} from '~/src/services/image/filter/threshold';
import {WebGLShaderRunner} from '~/src/services/image/filter/webgl-runner';

import fragmentShaderSource from './glsl/threshold.glsl';

export function thresholdFilterWebGL(image: ImageBitmap, thresholds: number[]): ImageBitmap[] {
  const {width, height} = image;
  const runner = new WebGLShaderRunner(fragmentShaderSource, width, height);
  const {gl, program} = runner;
  runner.createTexture(image);

  const thresholdsLocation = gl.getUniformLocation(program, 'u_thresholds');
  const colorsLocation = gl.getUniformLocation(program, 'u_values');
  const toneLocation = gl.getUniformLocation(program, 'u_tone');
  gl.uniform1fv(thresholdsLocation, new Float32Array(thresholds));
  gl.uniform1fv(colorsLocation, new Float32Array(THRESHOLD_VALUES));

  const resultImages = thresholds.map((_, i) => {
    gl.uniform1i(toneLocation, i);
    runner.clear();
    runner.draw();
    return runner.transferToImageBitmap();
  });
  runner.cleanUp();
  return resultImages;
}
