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
import type {DrawImageSource} from '~/src/utils/graphics';
import {copyOffscreenCanvas} from '~/src/utils/graphics';

import fragmentShaderSource from './glsl/threshold.glsl';

const desc = (a: number, b: number) => b - a;

export function thresholdFilterWebGL(
  image: DrawImageSource,
  thresholds: number[],
  values: number[],
  grayscaleInput = false
): OffscreenCanvas[] {
  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [['u_thresholds', 'u_values', 'u_tone', 'u_grayscale']],
    image
  );
  thresholds = [...thresholds].sort(desc);
  values = [...values].sort(desc);
  const results: OffscreenCanvas[] = thresholds.map((_, i) => {
    renderer.clear();
    renderer.render([
      {
        setUniforms(gl, locations) {
          gl.uniform1fv(locations.get('u_thresholds')!, new Float32Array(thresholds));
          gl.uniform1fv(locations.get('u_values')!, new Float32Array(values));
          gl.uniform1i(locations.get('u_tone')!, i);
          gl.uniform1i(locations.get('u_grayscale')!, grayscaleInput ? 1 : 0);
        },
      },
    ]);
    return copyOffscreenCanvas(renderer.canvas);
  });
  renderer.cleanUp();
  return results;
}
