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
import {clamp} from '~/src/services/math/clamp';
import {runInference} from '~/src/services/ml/inference';
import {imageDataToTensor, tensorToImageData} from '~/src/services/ml/tensor';
import type {OnnxModel} from '~/src/services/ml/types';
import type {ProgressCallback} from '~/src/utils/fetch';
import {
  createImageBitmapResizedTotalPixels,
  IMAGE_SIZE,
  imageBitmapToImageData,
  resizeAndCrop,
} from '~/src/utils/graphics';

const MAX_SCALE_FACTOR = 3;

export async function transformImage(
  images: ImageBitmap[],
  model: OnnxModel,
  progressCallback?: ProgressCallback
): Promise<OffscreenCanvas> {
  const {url: modelUrl, resolution, standardDeviation, mean} = model;
  let imageDataArray: ImageData[];
  let width = 0;
  let height = 0;
  if (resolution) {
    imageDataArray = images.map((image: ImageBitmap): ImageData => {
      const [imageData] = imageBitmapToImageData(image, resizeAndCrop(resolution, resolution));
      return imageData;
    });
    width = height = resolution;
  } else {
    imageDataArray = await Promise.all(
      images.map(async (image): Promise<ImageData> => {
        const resizedImage: ImageBitmap = await createImageBitmapResizedTotalPixels(
          image,
          IMAGE_SIZE.SD
        );
        const [imageData] = imageBitmapToImageData(resizedImage);
        resizedImage.close();
        return imageData;
      })
    );
    const [image] = images;
    ({width, height} = image!);
  }
  const scaleFactor: number = clamp(
    Math.sqrt(IMAGE_SIZE.HD / (width * height)),
    1,
    MAX_SCALE_FACTOR
  );
  const outputWidth = Math.trunc(scaleFactor * width);
  const outputHeight = Math.trunc(scaleFactor * height);
  const inputTensors = imageDataArray.map(imageData =>
    imageDataToTensor(imageData, standardDeviation, mean)
  );
  const [outputTensor] = await runInference(modelUrl, [inputTensors], progressCallback);
  const outputImage = await createImageBitmap(
    tensorToImageData(outputTensor!, standardDeviation, mean)
  );
  const resizedOutputImage: OffscreenCanvas = interpolationWebGL(
    outputImage,
    outputWidth,
    outputHeight,
    Interpolation.Lanczos
  );
  outputImage.close();
  return resizedOutputImage;
}
