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

import {WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas, type ImageDimension, scaleToPixelCount} from '@/utils/graphics';

import fragmentShaderSource from './glsl/invert-colors.glsl';

/**
 * With `maxPixelCount` the pass renders into a smaller target, so the sampler minifies during the
 * draw that already happens. A separate resize would cost more than the inversion.
 */
export function invertColorsWebGL(image: OffscreenCanvas, maxPixelCount?: number): OffscreenCanvas {
  const scale = maxPixelCount ? scaleToPixelCount(image.width, image.height, maxPixelCount) : 1;
  const size: ImageDimension | undefined =
    scale < 1
      ? {
          width: Math.max(1, Math.floor(image.width * scale)),
          height: Math.max(1, Math.floor(image.height * scale)),
        }
      : undefined;
  const renderer = new WebGLRenderer([fragmentShaderSource], [], image, {size});
  renderer.render();
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return result;
}
