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
import {Interpolation, interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {imageBitmapToImageData} from '@/services/ml/image-transformer';
import {type Float32Tensor, imageDataToFloat32Tensor} from '@/services/ml/tensor';
import type {OnnxModel} from '@/services/ml/types';
import {runInferenceWorker} from '@/services/ml/worker/inference-worker-manager';
import type {FetchProgressCallback} from '@/utils/fetch';
import {applyMask, type DrawImageSource} from '@/utils/graphics';

export async function createBackgroundMask(
  image: ImageBitmap,
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {url: modelUrl, outputName} = model;
  const [imageData] = imageBitmapToImageData([image], model);
  const inputTensor = imageDataToFloat32Tensor(imageData!, model);
  const [outputTensor] = await runInferenceWorker(
    modelUrl,
    auth,
    [[inputTensor]],
    outputName,
    progressCallback,
    signal
  );
  const mask = await float32TensorToMask(outputTensor!, imageData!.width, imageData!.height);
  return mask;
}

async function float32TensorToMask(
  {data: maskData}: Float32Tensor,
  origWidth: number,
  origHeight: number
): Promise<ImageBitmap> {
  const pixelCount = origWidth * origHeight;
  const data = new Uint8ClampedArray(4 * pixelCount).fill(255);
  for (let i = 0; i < pixelCount; i++) {
    const j = 4 * i;
    const alpha = maskData[i]! * 255;
    data[j + 3] = alpha;
  }
  return await createImageBitmap(new ImageData(data, origWidth, origHeight));
}

export function removeBackground(image: DrawImageSource, mask: DrawImageSource): OffscreenCanvas {
  return applyMask(
    image,
    interpolationWebGL(mask, image.width, image.height, Interpolation.Bilinear)
  );
}
