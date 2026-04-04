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

import type {RgbTuple} from '~/src/services/color/space/rgb';
import {colorMatchFilterWebGL} from '~/src/services/image/filter/color-match-webgl';

export function getColorMatchImage(
  image: ImageBitmap,
  color: RgbTuple,
  threshold = 0.05
): ImageBitmap {
  console.time('color-match');
  const colorMatchImage: ImageBitmap = colorMatchFilterWebGL(image, color, threshold);
  console.timeEnd('color-match');
  return colorMatchImage;
}
