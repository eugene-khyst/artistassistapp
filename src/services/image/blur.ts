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

import {kuwaharaFilterWebGL} from '~/src/services/image/filter/kuwahara-filter-webgl';
import type {DrawImageSource} from '~/src/utils/graphics';
import {IMAGE_SIZE, ResizeImage, resizeImageBitmap} from '~/src/utils/graphics';

export async function getBlurred(image: DrawImageSource): Promise<ImageBitmap[]> {
  console.time('blur');
  const resizedImage = await resizeImageBitmap(
    image,
    ResizeImage.resizeToPixelCount(IMAGE_SIZE.HD)
  );
  let blurred: ImageBitmap[] = kuwaharaFilterWebGL(resizedImage, [2, 3, 4, 5]).map(canvas =>
    canvas.transferToImageBitmap()
  );
  blurred = [resizedImage, ...blurred];
  console.timeEnd('blur');
  return blurred;
}
