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

import {WebGLRenderer} from '~/src/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '~/src/utils/graphics';

import bilinearFragmentShaderSource from './glsl/bilinear-interpolation.glsl';
import lanczosFragmentShaderSource from './glsl/lanczos-interpolation.glsl';

export enum Interpolation {
  Bilinear = 'bilinear',
  Lanczos = 'lanczos',
}

const FRAGMENT_SHADER_SOURCES: Record<Interpolation, string> = {
  [Interpolation.Bilinear]: bilinearFragmentShaderSource,
  [Interpolation.Lanczos]: lanczosFragmentShaderSource,
};

export function interpolationWebGL(
  image: ImageBitmap | OffscreenCanvas,
  targetWidth: number,
  targetHeight: number,
  interpolation = Interpolation.Bilinear
): OffscreenCanvas {
  const fragmentShaderSource = FRAGMENT_SHADER_SOURCES[interpolation]!;
  const renderer = new WebGLRenderer(fragmentShaderSource, image, [targetWidth, targetHeight]);
  renderer.draw();
  const resultCanvas = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return resultCanvas;
}
