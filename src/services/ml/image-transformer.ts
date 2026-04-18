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
import {float32TensorToImageData, imageDataToFloat32Tensor} from '~/src/services/ml/tensor';
import type {OnnxModel} from '~/src/services/ml/types';
import {runInferenceWorker} from '~/src/services/ml/worker/inference-worker-manager';
import type {FetchProgressCallback} from '~/src/utils/fetch';
import type {DrawImageSource} from '~/src/utils/graphics';
import {
  DrawImage,
  drawImageToOffscreenCanvas,
  IMAGE_SIZE,
  offscreenCanvasToImageData,
} from '~/src/utils/graphics';
import {clamp} from '~/src/utils/math-utils';

const MAX_SCALE = 3;

export async function transformImage(
  images: DrawImageSource[],
  model: OnnxModel,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {url: modelUrl, outputName} = model;
  const imageDataArray: ImageData[] = imageBitmapToImageData(images, model);
  const [imageData] = imageDataArray;
  const {width, height} = imageData!;
  const scale: number = clamp(Math.sqrt(IMAGE_SIZE['2K'] / (width * height)), 1, MAX_SCALE);
  const resizeWidth = Math.round(scale * width);
  const resizeHeight = Math.round(scale * height);
  const inputTensors = imageDataArray.map(imageData => imageDataToFloat32Tensor(imageData, model));
  const [outputTensor] = await runInferenceWorker(
    modelUrl,
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
