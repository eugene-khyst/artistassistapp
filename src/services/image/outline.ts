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

import type {Authentication} from '@/services/auth/types';
import {computeOtsuThreshold} from '@/services/image/filter/otsu-threshold';
import {sobelEdgeDetectionWebGL} from '@/services/image/filter/sobel-edge-detection-webgl';
import {thresholdFilterWebGL} from '@/services/image/filter/threshold-webgl';
import {transformImage} from '@/services/ml/image-transformer';
import {type OnnxModel} from '@/services/ml/types';
import type {FetchProgressCallback} from '@/utils/fetch';
import type {DrawImageSource} from '@/utils/graphics';
import {offscreenCanvasToImageData} from '@/utils/graphics';

export async function getOutline(
  image: DrawImageSource,
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  console.time('outline');
  let outlineImage: ImageBitmap;
  if (model.url) {
    outlineImage = await transformImage([image], model, auth, progressCallback, signal);
  } else {
    outlineImage = sobelEdgeDetection(image);
  }
  console.timeEnd('outline');
  return outlineImage;
}

function sobelEdgeDetection(image: DrawImageSource) {
  const sobelImage: OffscreenCanvas = sobelEdgeDetectionWebGL(image);
  const threshold = computeOtsuThreshold(offscreenCanvasToImageData(sobelImage), true);
  const [thresholdImage] = thresholdFilterWebGL(sobelImage, [threshold], [0], true);
  return thresholdImage!.transferToImageBitmap();
}
