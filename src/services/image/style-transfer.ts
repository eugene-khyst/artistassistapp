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
import {imageDataToTensor, tensorToImageData} from '~/src/services/ml/image-tensor';
import {runInference} from '~/src/services/ml/inference';
import type {OnnxModel} from '~/src/services/ml/types';
import type {ProgressCallback} from '~/src/utils/fetch';
import {imageBitmapToImageDataResizedAndCropped} from '~/src/utils/graphics';

export async function transferStyle(
  file: File,
  model: OnnxModel,
  progressCallback?: ProgressCallback
): Promise<Blob> {
  console.time('style-transfer');
  const {resolution, url: modelUrl} = model;
  const image: ImageBitmap = await createImageBitmap(file);
  const [imageData] = imageBitmapToImageDataResizedAndCropped(image, resolution, resolution);
  image.close();
  const inputTensor = imageDataToTensor(imageData);
  const [outputTensor] = await runInference(modelUrl, [inputTensor], progressCallback);
  const outputImage = await createImageBitmap(tensorToImageData(outputTensor!));
  const scaleFactor = 3;
  const scaledOutputImage: OffscreenCanvas = interpolationWebGL(
    outputImage,
    scaleFactor * resolution,
    scaleFactor * resolution,
    Interpolation.Lanczos
  );
  outputImage.close();
  const outputBlob: Blob = await scaledOutputImage.convertToBlob({
    type: 'image/jpeg',
    quality: 0.95,
  });
  console.timeEnd('style-transfer');
  return outputBlob;
}
