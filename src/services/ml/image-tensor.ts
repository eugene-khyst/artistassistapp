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

import {Tensor} from 'onnxruntime-web';

import type {RgbTuple} from '~/src/services/color/space/rgb';

export function imageDataToTensor(
  {data, width, height}: ImageData,
  std: RgbTuple = [1, 1, 1],
  mean: RgbTuple = [0, 0, 0]
): Tensor {
  const totalPixels = width * height;
  const float32Data = new Float32Array(3 * totalPixels);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    float32Data[j] = (data[i]! - mean[0]) / std[0];
    float32Data[j + totalPixels] = (data[i + 1]! - mean[1]) / std[1];
    float32Data[j + 2 * totalPixels] = (data[i + 2]! - mean[2]) / std[2];
  }
  return new Tensor('float32', float32Data, [1, 3, height, width]);
}

export function tensorToImageData(
  {data, dims: [_batch, _channels, height, width]}: Tensor,
  std: RgbTuple = [1, 1, 1]
): ImageData {
  const totalPixels = width! * height!;
  const imageData = new Uint8ClampedArray(4 * totalPixels);
  for (let y = 0; y < height!; y++) {
    for (let x = 0; x < width!; x++) {
      const i = y * width! + x;
      const j = 4 * i;
      imageData[j] = (data[i] as number) * std[0];
      imageData[j + 1] = (data[i + totalPixels] as number) * std[1];
      imageData[j + 2] = (data[i + 2 * totalPixels] as number) * std[2];
      imageData[j + 3] = 255;
    }
  }
  return new ImageData(imageData, width!, height!);
}
