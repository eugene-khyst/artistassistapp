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
import {getProcessedImage, saveProcessedImage} from '@/services/db/processed-image-db';
import {interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {Interpolation} from '@/services/image/filter/types';
import {float32TensorToImageData, imageDataToFloat32Tensor} from '@/services/ml/tensor';
import type {OnnxModel} from '@/services/ml/types';
import {type InferenceRun, runInferenceWorker} from '@/services/ml/worker/inference-worker-manager';
import type {FetchProgressCallback} from '@/utils/fetch';
import {
  DrawImage,
  type DrawImageSource,
  drawImageToOffscreenCanvas,
  IMAGE_SIZE,
  imageDataToOffscreenCanvas,
  imageToBlob,
  offscreenCanvasToImageData,
} from '@/utils/graphics';

export async function transformImage({
  images,
  model,
  auth,
  progressCallback,
  signal,
  interpolation = Interpolation.Lanczos,
}: {
  images: DrawImageSource[];
  model: OnnxModel;
  auth: Authentication | null;
  progressCallback?: FetchProgressCallback;
  signal?: AbortSignal;
  interpolation?: Interpolation | null;
}): Promise<OffscreenCanvas> {
  return await transformImageInSession({
    images,
    model,
    interpolation,
    run: (inputTensors, outputName) =>
      runInferenceWorker(model.url, auth, inputTensors, outputName, progressCallback, signal),
  });
}

export async function transformImageInSession({
  images,
  model,
  run,
  interpolation = Interpolation.Lanczos,
}: {
  images: DrawImageSource[];
  model: OnnxModel;
  run: InferenceRun;
  interpolation?: Interpolation | null;
}): Promise<OffscreenCanvas> {
  const {width, height} = images[0]!;
  const inputTensors = imageBitmapToImageData(images, model).map((imageData, index) =>
    imageDataToFloat32Tensor(imageData, model, index)
  );
  const [outputTensor] = await run([inputTensors], model.outputName);
  const outputCanvas = imageDataToOffscreenCanvas(float32TensorToImageData(outputTensor!, model));
  return interpolation
    ? interpolationWebGL(outputCanvas, width, height, interpolation)
    : outputCanvas;
}

export async function withProcessedImageCache(
  model: OnnxModel,
  digests: string[],
  transform: () => Promise<OffscreenCanvas>,
  encodeOptions?: ImageEncodeOptions
): Promise<ImageBitmap> {
  if (!model.url) {
    return (await transform()).transferToImageBitmap();
  }
  try {
    const cachedImage: Blob | undefined = await getProcessedImage(model, digests);
    if (cachedImage) {
      return await createImageBitmap(cachedImage);
    }
  } catch (error) {
    console.warn('Failed to read or decode processed-image cache', error);
  }
  const canvas: OffscreenCanvas = await transform();
  try {
    await saveProcessedImage(model, digests, await imageToBlob(canvas, {encodeOptions}));
  } catch (error) {
    console.warn('Failed to save processed-image cache', error);
  }
  return canvas.transferToImageBitmap();
}

export async function withProcessedImageBlobCache(
  model: OnnxModel,
  digests: string[],
  transform: () => Promise<OffscreenCanvas>,
  encodeOptions?: ImageEncodeOptions
): Promise<Blob> {
  if (!model.url) {
    return await transformToBlob(transform, encodeOptions);
  }
  try {
    const cachedImage: Blob | undefined = await getProcessedImage(model, digests);
    if (cachedImage) {
      return cachedImage;
    }
  } catch (error) {
    console.warn('Failed to read processed-image cache', error);
  }
  const blob: Blob = await transformToBlob(transform, encodeOptions);
  try {
    await saveProcessedImage(model, digests, blob);
  } catch (error) {
    console.warn('Failed to save processed-image cache', error);
  }
  return blob;
}

async function transformToBlob(
  transform: () => Promise<OffscreenCanvas>,
  encodeOptions?: ImageEncodeOptions
): Promise<Blob> {
  return await imageToBlob(await transform(), {encodeOptions});
}

export function imageBitmapToImageData(
  images: DrawImageSource[],
  {resolution, maxPixelCount = IMAGE_SIZE.SD, inputSizeMultiple}: OnnxModel
): ImageData[] {
  const [width, height] = Array.isArray(resolution) ? resolution : [resolution, resolution];
  const drawImage =
    width && height
      ? DrawImage.resizeToSize(width, height)
      : DrawImage.resizeToPixelCount(maxPixelCount, inputSizeMultiple);
  return images.map((image: DrawImageSource): ImageData =>
    offscreenCanvasToImageData(
      ...drawImageToOffscreenCanvas(image, {
        willReadFrequently: true,
        drawImage,
        fillStyle: '#fff',
      })
    )
  );
}
