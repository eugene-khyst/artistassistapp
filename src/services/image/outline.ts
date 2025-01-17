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

import {sobelEdgeDetectionWebGL} from '~/src/services/image/filter/sobel-operator-webgl';
import {transformImage} from '~/src/services/ml/image-transformer';
import type {OnnxModel} from '~/src/services/ml/types';
import type {ProgressCallback} from '~/src/utils/fetch';
import {createImageBitmapResizedTotalPixels, IMAGE_SIZE} from '~/src/utils/graphics';

export async function getOutline(
  image: ImageBitmap,
  model?: OnnxModel | null,
  progressCallback?: ProgressCallback
): Promise<ImageBitmap> {
  console.time('outline');
  let outline: ImageBitmap;
  if (model) {
    const transformedImage: OffscreenCanvas = await transformImage(image, model, progressCallback);
    outline = transformedImage.transferToImageBitmap();
  } else {
    const resizedImage: ImageBitmap = await createImageBitmapResizedTotalPixels(
      image,
      IMAGE_SIZE['2K']
    );
    outline = sobelEdgeDetectionWebGL(resizedImage);
    resizedImage.close();
  }
  console.timeEnd('outline');
  return outline;
}
