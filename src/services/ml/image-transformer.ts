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

import {Interpolation, interpolationWebGL} from '~/src/services/image/filter/interpolation-webgl';
import {runInference} from '~/src/services/ml/inference';
import {imageDataToTensor, tensorToImageData} from '~/src/services/ml/tensor';
import type {OnnxModel} from '~/src/services/ml/types';
import type {ProgressCallback} from '~/src/utils/fetch';
import {
  createImageBitmapResizedTotalPixels,
  IMAGE_SIZE,
  imageBitmapToImageData,
  imageBitmapToImageDataResizedAndCropped,
} from '~/src/utils/graphics';

const SCALE_FACTOR = 3;

export async function transformImage(
  image: ImageBitmap,
  model: OnnxModel,
  progressCallback?: ProgressCallback
): Promise<OffscreenCanvas> {
  const {url: modelUrl, resolution, standardDeviation, mean} = model;
  let imageData: ImageData;
  let outputWidth: number;
  let outputHeight: number;
  if (resolution) {
    [imageData] = imageBitmapToImageDataResizedAndCropped(image, resolution, resolution);
    outputWidth = SCALE_FACTOR * resolution;
    outputHeight = SCALE_FACTOR * resolution;
  } else {
    const resizedImage: ImageBitmap = await createImageBitmapResizedTotalPixels(
      image,
      IMAGE_SIZE.SD
    );
    [imageData] = imageBitmapToImageData(resizedImage);
    resizedImage.close();
    const {width, height} = image;
    const scaleFactor: number = Math.min(1, Math.sqrt(IMAGE_SIZE.HD / (width * height)));
    outputWidth = Math.trunc(scaleFactor * width);
    outputHeight = Math.trunc(scaleFactor * height);
  }
  const inputTensor = imageDataToTensor(imageData, standardDeviation, mean);
  const [outputTensor] = await runInference(modelUrl, [inputTensor], progressCallback);
  const outputImage = await createImageBitmap(tensorToImageData(outputTensor!, standardDeviation));
  const resizedOutputImage: OffscreenCanvas = interpolationWebGL(
    outputImage,
    outputWidth,
    outputHeight,
    Interpolation.Lanczos
  );
  outputImage.close();
  return resizedOutputImage;
}
