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

import fragmentShaderSource from './glsl/invert-colors.glsl';

export function invertColorsWebGL(image: ImageBitmap): ImageBitmap {
  const renderer = new WebGLRenderer([fragmentShaderSource], [], image);
  renderer.render();
  const resultImage = copyOffscreenCanvas(renderer.canvas).transferToImageBitmap();
  renderer.cleanUp();
  return resultImage;
}
