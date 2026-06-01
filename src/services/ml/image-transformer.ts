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
import {float32TensorToImageData, imageDataToFloat32Tensor} from '@/services/ml/tensor';
import type {OnnxModel} from '@/services/ml/types';
import {runInferenceWorker} from '@/services/ml/worker/inference-worker-manager';
import type {FetchProgressCallback} from '@/utils/fetch';
import type {DrawImageSource} from '@/utils/graphics';
import {
  DrawImage,
  drawImageToOffscreenCanvas,
  fitToAspectRatio,
  IMAGE_SIZE,
  offscreenCanvasToImageData,
} from '@/utils/graphics';

export async function transformImage(
  images: DrawImageSource[],
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {url: modelUrl, resolution, preserveAspectRatio, outputName} = model;
  const [image] = images;
  const {width, height} = image!;
  const [resizeWidth, resizeHeight] =
    preserveAspectRatio && resolution
      ? fitToAspectRatio(width, height, resolution)
      : [width, height];
  const imageDataArray: ImageData[] = imageBitmapToImageData(images, model);
  const inputTensors = imageDataArray.map(imageData => imageDataToFloat32Tensor(imageData, model));
  const [outputTensor] = await runInferenceWorker(
    modelUrl,
    auth,
    [inputTensors],
    outputName,
    progressCallback,
    signal
  );
  const outputImage = await createImageBitmap(float32TensorToImageData(outputTensor!, model));
  const resizedOutputImage = interpolationWebGL(
    outputImage,
    resizeWidth,
    resizeHeight,
    Interpolation.Lanczos
  ).transferToImageBitmap();
  outputImage.close();
  return resizedOutputImage;
}

export function imageBitmapToImageData(
  images: DrawImageSource[],
  {
    resolution,
    maxPixelCount = IMAGE_SIZE.SD,
    inputSizeMultiple,
    preserveAspectRatio = false,
  }: OnnxModel
): ImageData[] {
  const [width, height] = Array.isArray(resolution) ? resolution : [resolution, resolution];
  const drawImage =
    width && height
      ? preserveAspectRatio
        ? DrawImage.resizeAndCrop(width, height)
        : DrawImage.resizeToSize(width, height)
      : DrawImage.resizeToPixelCount(maxPixelCount, inputSizeMultiple);
  return images.map(
    (image: DrawImageSource): ImageData =>
      offscreenCanvasToImageData(
        ...drawImageToOffscreenCanvas(image, {
          willReadFrequently: true,
          drawImage,
        })
      )
  );
}
