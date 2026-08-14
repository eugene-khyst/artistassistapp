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

import {kuwaharaFilterWebGL} from '@/services/image/filter/kuwahara-filter-webgl';
import {multiLayerRadialMaskWebGL} from '@/services/image/filter/multi-layer-radial-mask-webgl';
import type {Vector} from '@/services/math/geometry';
import {type DrawImageSource, IMAGE_SIZE, ResizeImage, resizeImageBitmap} from '@/utils/graphics';

export async function getBlurred(image: DrawImageSource): Promise<ImageBitmap[]> {
  console.time('blur');
  const resizedImage = await resizeImageBitmap(
    image,
    ResizeImage.resizeToPixelCount(IMAGE_SIZE.HD)
  );
  try {
    return kuwaharaFilterWebGL(resizedImage, [2, 4, 6]).map(canvas =>
      canvas.transferToImageBitmap()
    );
  } finally {
    resizedImage.close();
    console.timeEnd('blur');
  }
}

export function getBlurredMasked(blurred: ImageBitmap[], focalPoint?: Vector): ImageBitmap {
  console.time('blur-mask');
  const blurredMasked = multiLayerRadialMaskWebGL(
    blurred,
    [0.3, 0.6, 1],
    focalPoint
  ).transferToImageBitmap();
  console.timeEnd('blur-mask');
  return blurredMasked;
}
