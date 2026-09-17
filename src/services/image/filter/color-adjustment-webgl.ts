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

import {kelvinToRgb} from '@eugene-khyst/artistassistapp-color-mixer';

import type {AdjustmentParameters, WhiteBalanceLevels} from '@/services/image/adjust-colors';
import {WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '@/utils/graphics';

import fragmentShaderSource from './glsl/color-adjustment.glsl';

export function adjustColorsWebGL(
  image: OffscreenCanvas,
  {
    saturation = 1,
    inputLow = 0,
    inputHigh = 1,
    gamma = 1,
    outputLow = 0,
    outputHigh = 1,
    origTemperature = 6500,
    targetTemperature = 6500,
  }: AdjustmentParameters = {},
  {minValues = [0, 0, 0], maxValues = [1, 1, 1]}: WhiteBalanceLevels = {}
): OffscreenCanvas {
  const levels = maxValues.map((max, i) => {
    const min = minValues[i]!;
    return max > min ? {min, invRange: 1 / (max - min)} : {min: 0, invRange: 1};
  });
  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [
      [
        'u_minValues',
        'u_invRanges',
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
          locations.get('u_minValues')!,
          levels.map(({min}) => min)
        );
        gl.uniform3fv(
          locations.get('u_invRanges')!,
          levels.map(({invRange}) => invRange)
        );
        gl.uniform1f(locations.get('u_saturation')!, saturation);
        gl.uniform1f(locations.get('u_inputLow')!, inputLow);
        gl.uniform1f(locations.get('u_inputHigh')!, inputHigh);
        gl.uniform1f(locations.get('u_gamma')!, gamma);
        gl.uniform1f(locations.get('u_outputLow')!, outputLow);
        gl.uniform1f(locations.get('u_outputHigh')!, outputHigh);
        const [origTempR, origTempG, origTempB] = kelvinToRgb(origTemperature);
        const [targetTempR, targetTempG, targetTempB] = kelvinToRgb(targetTemperature);
        gl.uniform1f(locations.get('u_scaleR')!, (origTempR || 1) / (targetTempR || 1));
        gl.uniform1f(locations.get('u_scaleG')!, (origTempG || 1) / (targetTempG || 1));
        gl.uniform1f(locations.get('u_scaleB')!, (origTempB || 1) / (targetTempB || 1));
      },
    },
  ]);
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return result;
}
