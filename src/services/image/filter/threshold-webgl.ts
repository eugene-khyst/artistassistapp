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

import {THRESHOLD_COLORS} from '~/src/services/image/filter/threshold';
import {WebGLShaderRunner} from '~/src/services/image/filter/webgl-runner';

import fragmentShaderSource from './glsl/threshold.glsl';

export function thresholdFilterWebGL(image: ImageBitmap, thresholds: number[]): ImageBitmap[] {
  const {width, height} = image;
  const runner = new WebGLShaderRunner(fragmentShaderSource, width, height);
  const {gl, program} = runner;

  const attachments = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2];
  runner.createFramebuffer(attachments);
  runner.createTexture(image);
  gl.activeTexture(gl.TEXTURE0);

  const thresholdsLocation = gl.getUniformLocation(program, 'u_thresholds');
  const colorsLocation = gl.getUniformLocation(program, 'u_colors');
  gl.uniform1fv(thresholdsLocation, new Float32Array(thresholds));
  gl.uniform1fv(colorsLocation, new Float32Array(THRESHOLD_COLORS));

  runner.draw();

  const resultImages: ImageBitmap[] = attachments.map(attachment => {
    runner.blitFramebuffer(attachment);
    return runner.transferToImageBitmap();
  });

  runner.cleanUp();

  return resultImages;
}
