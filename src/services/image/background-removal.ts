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

import type {Tensor} from 'onnxruntime-web';

import {Interpolation, interpolationWebGL} from '~/src/services/image/filter/interpolation-webgl';
import {runInference} from '~/src/services/ml/inference';
import {imageDataToTensor} from '~/src/services/ml/tensor';
import type {OnnxModel} from '~/src/services/ml/types';
import type {ProgressCallback} from '~/src/utils/fetch';
import {applyMask, imageBitmapToImageData} from '~/src/utils/graphics';

export async function removeBackground(
  blob: Blob,
  model: OnnxModel,
  progressCallback?: ProgressCallback
): Promise<Blob> {
  console.time('background-removal');
  const {url: modelUrl, resolution, standardDeviation, mean} = model;
  const originalImage = await createImageBitmap(blob);
  const {width: originalWidth, height: originalHeight} = originalImage;
  const resizedImage = await createImageBitmap(originalImage, {
    resizeWidth: resolution,
    resizeHeight: resolution,
  });
  const [imageData] = imageBitmapToImageData(resizedImage);
  resizedImage.close();
  const inputTensor = imageDataToTensor(imageData, standardDeviation, mean);
  const [outputTensor] = await runInference(modelUrl, [inputTensor], progressCallback);
  const mask: OffscreenCanvas = tensorToMask(
    outputTensor!,
    resolution!,
    originalWidth,
    originalHeight
  );
  const noBgBlob: Blob = await applyMask(originalImage, mask).convertToBlob({type: 'image/png'});
  originalImage.close();
  console.timeEnd('background-removal');
  return noBgBlob;
}

function tensorToMask(
  {data: maskData}: Tensor,
  resolution: number,
  width: number,
  height: number
): OffscreenCanvas {
  const totalPixels = resolution * resolution;
  const data = new Uint8ClampedArray(4 * totalPixels).fill(255);
  for (let i = 0; i < totalPixels; i++) {
    const j = 4 * i;
    const alpha = (maskData[i] as number) * 255;
    data[j + 3] = alpha;
  }
  const canvas = new OffscreenCanvas(resolution, resolution);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d')!;
  ctx.putImageData(new ImageData(data, resolution, resolution), 0, 0);
  return interpolationWebGL(canvas, width, height, Interpolation.Bilinear);
}
