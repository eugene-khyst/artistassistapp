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

import {kelvinToRgb} from '~/src/services/color/color-temperature';
import type {AdjustmentParameters} from '~/src/services/image/color-correction';
import {WebGLRenderer} from '~/src/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '~/src/utils/graphics';

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
  }: AdjustmentParameters = {}
): ImageBitmap {
  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [
      [
        'u_invMaxValues',
        'u_saturation',
        'u_inputLow',
        'u_inputHigh',
        'u_gamma',
        'u_outputLow',
        'u_outputHigh',
        'u_scaleR',
        'u_scaleG',
        'u_scaleB',
      ],
    ],
    image
  );
  renderer.render([
    {
      setUniforms(gl, locations) {
        gl.uniform3fv(
          locations.get('u_invMaxValues')!,
          new Float32Array(maxValues.map(v => 1 / v))
        );
        gl.uniform1f(locations.get('u_saturation')!, saturation);
        gl.uniform1f(locations.get('u_inputLow')!, inputLow);
        gl.uniform1f(locations.get('u_inputHigh')!, inputHigh);
        gl.uniform1f(locations.get('u_gamma')!, gamma);
        gl.uniform1f(locations.get('u_outputLow')!, outputLow);
        gl.uniform1f(locations.get('u_outputHigh')!, outputHigh);
        const origTempRgb = kelvinToRgb(origTemperature);
        const targetTempRgb = kelvinToRgb(targetTemperature);
        gl.uniform1f(locations.get('u_scaleR')!, (origTempRgb.r || 1) / (targetTempRgb.r || 1));
        gl.uniform1f(locations.get('u_scaleG')!, (origTempRgb.g || 1) / (targetTempRgb.g || 1));
        gl.uniform1f(locations.get('u_scaleB')!, (origTempRgb.b || 1) / (targetTempRgb.b || 1));
      },
    },
  ]);
  const resultImage = copyOffscreenCanvas(renderer.canvas).transferToImageBitmap();
  renderer.cleanUp();
  return resultImage;
}
