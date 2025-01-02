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

import {kelvinToRgb} from '~/src/services/color';
import type {AdjustmentParameters} from '~/src/services/image/filter/adjust-colors';
import {WebGLRenderer} from '~/src/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '~/src/utils';

import fragmentShaderSource from './glsl/color-correction.glsl';

export function adjustColorsWebGL(
  image: ImageBitmap,
  maxValues: number[] = [1, 1, 1],
  {
    saturation = 1,
    inputLow = 0,
    inputHigh = 1,
    gamma = 1,
    outputLow = 0,
    outputHigh = 1,
    origTemperature = 6500,
    targetTemperature = 6500,
  }: AdjustmentParameters
): ImageBitmap {
  const {width, height} = image;
  const renderer = new WebGLRenderer(fragmentShaderSource, width, height);
  const {canvas, gl, program} = renderer;
  renderer.createTexture(image);

  const maxValuesLocation = gl.getUniformLocation(program, 'u_invMaxValues');
  const saturationLocation = gl.getUniformLocation(program, 'u_saturation');
  const inputLowLocation = gl.getUniformLocation(program, 'u_inputLow');
  const inputHighLocation = gl.getUniformLocation(program, 'u_inputHigh');
  const gammaLocation = gl.getUniformLocation(program, 'u_gamma');
  const outputLowLocation = gl.getUniformLocation(program, 'u_outputLow');
  const outputHighLocation = gl.getUniformLocation(program, 'u_outputHigh');
  const scaleRLocation = gl.getUniformLocation(program, 'u_scaleR');
  const scaleGLocation = gl.getUniformLocation(program, 'u_scaleG');
  const scaleBLocation = gl.getUniformLocation(program, 'u_scaleB');
  gl.uniform3fv(maxValuesLocation, new Float32Array(maxValues.map(v => 1 / v)));
  gl.uniform1f(saturationLocation, saturation);
  gl.uniform1f(inputLowLocation, inputLow);
  gl.uniform1f(inputHighLocation, inputHigh);
  gl.uniform1f(gammaLocation, gamma);
  gl.uniform1f(outputLowLocation, outputLow);
  gl.uniform1f(outputHighLocation, outputHigh);
  const origTempRgb = kelvinToRgb(origTemperature);
  const targetTempRgb = kelvinToRgb(targetTemperature);
  gl.uniform1f(scaleRLocation, (origTempRgb.r || 1) / (targetTempRgb.r || 1));
  gl.uniform1f(scaleGLocation, (origTempRgb.g || 1) / (targetTempRgb.g || 1));
  gl.uniform1f(scaleBLocation, (origTempRgb.b || 1) / (targetTempRgb.b || 1));

  renderer.draw();
  const resultImage = copyOffscreenCanvas(canvas).transferToImageBitmap();
  renderer.cleanUp();
  return resultImage;
}
