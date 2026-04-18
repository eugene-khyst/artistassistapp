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

import {Interpolation, interpolationWebGL} from '~/src/services/image/filter/interpolation-webgl';
import {imageBitmapToImageData} from '~/src/services/ml/image-transformer';
import type {Float32Tensor} from '~/src/services/ml/tensor';
import {imageDataToFloat32Tensor} from '~/src/services/ml/tensor';
import type {OnnxModel} from '~/src/services/ml/types';
import {runInferenceWorker} from '~/src/services/ml/worker/inference-worker-manager';
import type {FetchProgressCallback} from '~/src/utils/fetch';
import {applyMask} from '~/src/utils/graphics';

export async function removeBackground(
  blob: Blob,
  model: OnnxModel,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<OffscreenCanvas> {
  console.time('background-removal');
  const {url: modelUrl, outputName} = model;
  const originalImage = await createImageBitmap(blob);
  const [imageData] = imageBitmapToImageData([originalImage], model);
  const inputTensor = imageDataToFloat32Tensor(imageData!, model);
  const [outputTensor] = await runInferenceWorker(
    modelUrl,
    [[inputTensor]],
    outputName,
    progressCallback,
    signal
  );
  const mask: ImageBitmap = await float32TensorToMask(
    outputTensor!,
    imageData!.width,
    imageData!.height,
    originalImage.width,
    originalImage.height
  );
  const resultCanvas: OffscreenCanvas = applyMask(originalImage, mask);
  originalImage.close();
  mask.close();
  console.timeEnd('background-removal');
  return resultCanvas;
}

async function float32TensorToMask(
  {data: maskData}: Float32Tensor,
  origWidth: number,
  origHeight: number,
  targetWidth: number,
  targetHeight: number
): Promise<ImageBitmap> {
  const pixelCount = origWidth * origHeight;
  const data = new Uint8ClampedArray(4 * pixelCount).fill(255);
  for (let i = 0; i < pixelCount; i++) {
    const j = 4 * i;
    const alpha = maskData[i]! * 255;
    data[j + 3] = alpha;
  }
  return interpolationWebGL(
    await createImageBitmap(new ImageData(data, origWidth, origHeight)),
    targetWidth,
    targetHeight,
    Interpolation.Bilinear
  ).transferToImageBitmap();
}

export function fillBackgroundWithColor(canvas: OffscreenCanvas, color: string): void {
  const {width, height} = canvas;
  const ctx: OffscreenRenderingContext = canvas.getContext('2d')!;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
}
