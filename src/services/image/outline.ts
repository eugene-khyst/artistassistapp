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

import {computeOtsuThreshold} from '@eugene-khyst/artistassistapp-image-processing/filter/otsu-threshold';
import {sobelEdgeDetectionWebGL} from '@eugene-khyst/artistassistapp-image-processing/filter/sobel-edge-detection-webgl';
import {thresholdFilterWebGL} from '@eugene-khyst/artistassistapp-image-processing/filter/threshold-webgl';
import {
  type DrawImageSource,
  offscreenCanvasToImageData,
  toOffscreenCanvas,
} from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';

import type {Authentication} from '@/services/auth/types';
import {transformImage} from '@/services/ml/image-transformer';
import {type OnnxModel, SOBEL_EDGE_DETECTION_MODEL_ID} from '@/services/ml/types';
import type {FetchProgressCallback} from '@/utils/fetch';

export async function extractOutline(
  image: DrawImageSource,
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<OffscreenCanvas> {
  if (model.id === SOBEL_EDGE_DETECTION_MODEL_ID) {
    return sobelEdgeDetection(image);
  }
  return await transformImage({
    images: [image],
    model,
    auth,
    progressCallback,
    signal,
  });
}

function sobelEdgeDetection(image: DrawImageSource) {
  const sobelImage: OffscreenCanvas = sobelEdgeDetectionWebGL(toOffscreenCanvas(image));
  const threshold = computeOtsuThreshold(offscreenCanvasToImageData(sobelImage), true);
  const [thresholdImage] = thresholdFilterWebGL(sobelImage, [threshold], [0], {
    grayscaleInput: true,
  });
  return thresholdImage!;
}
