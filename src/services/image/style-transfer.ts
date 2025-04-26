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

import {transformImage} from '~/src/services/ml/image-transformer';
import type {OnnxModel} from '~/src/services/ml/types';
import type {ProgressCallback} from '~/src/utils/fetch';

export async function transferStyle(
  images: ImageBitmap[],
  model: OnnxModel,
  progressCallback?: ProgressCallback
): Promise<Blob> {
  console.time('style-transfer');
  const transformedImage: OffscreenCanvas = await transformImage(images, model, progressCallback);
  const outputBlob: Blob = await transformedImage.convertToBlob({
    type: 'image/jpeg',
    quality: 0.95,
  });
  console.timeEnd('style-transfer');
  return outputBlob;
}
