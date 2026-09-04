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

import {unlinearizeRgbChannel, writeRgbToXyz} from '@eugene-khyst/artistassistapp-color-mixer';

import {type Authentication} from '@/services/auth/types';
import {colorizeWebGL} from '@/services/image/filter/colorize-webgl';
import {
  getModelInputDrawImageParamsSupplier,
  imageBitmapToImageData,
  transformImage,
} from '@/services/ml/image-transformer';
import {imageDataToFloat32Tensor} from '@/services/ml/tensor';
import {type OnnxModel} from '@/services/ml/types';
import {runInferenceWorker} from '@/services/ml/worker/inference-worker-manager';
import {type FetchProgressCallback} from '@/utils/fetch';
import {drawImageToOffscreenCanvas, offscreenCanvasToBlob} from '@/utils/graphics';

export async function createColorizedImage({
  image,
  colorizeModel,
  upscaleModel,
  auth,
  progressCallback,
  signal,
}: {
  image: ImageBitmap;
  colorizeModel: OnnxModel;
  upscaleModel: OnnxModel;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<Blob> {
  const [resizedCanvas] = drawImageToOffscreenCanvas(image, {
    drawImage: getModelInputDrawImageParamsSupplier(colorizeModel),
    fillStyle: '#fff',
  });
  // Cleans up grain first: on a noisy scan the colorizer predicts no color at all.
  const upscaledImage = await transformImage({
    images: [resizedCanvas],
    model: upscaleModel,
    auth,
    progressCallback,
    signal,
    interpolation: null,
  });
  const inputTensors = imageBitmapToImageData([upscaledImage], colorizeModel).map(imageData => {
    const {data} = imageData;
    const xyz = new Float64Array(3);
    for (let i = 0; i < data.length; i += 4) {
      writeRgbToXyz(data[i]!, data[i + 1]!, data[i + 2]!, xyz, 0);
      const gray = unlinearizeRgbChannel(xyz[1]!);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    return imageDataToFloat32Tensor(imageData, colorizeModel);
  });
  const [outputTensor] = await runInferenceWorker(
    colorizeModel.url,
    auth,
    [inputTensors],
    colorizeModel.outputName,
    progressCallback,
    signal
  );
  const [, channels, outputHeight, outputWidth] = outputTensor!.dims;
  if (channels !== 2) {
    throw new Error(`Expected 2 output channels, got ${channels}`);
  }
  const channelSize = outputWidth! * outputHeight!;
  const a = outputTensor!.data.subarray(0, channelSize);
  const b = outputTensor!.data.subarray(channelSize, 2 * channelSize);
  const [origCanvas] = drawImageToOffscreenCanvas(image, {fillStyle: '#fff'});
  const colorizedCanvas = colorizeWebGL(origCanvas, {
    a,
    b,
    width: outputWidth!,
    height: outputHeight!,
  });
  return offscreenCanvasToBlob(colorizedCanvas, {
    type: 'image/webp',
    quality: 1,
  });
}
