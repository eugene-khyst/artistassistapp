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
  imageData: ImageData,
  width: number,
  height: number,
  mean: RgbTuple = [0, 0, 0],
  std: RgbTuple = [255, 255, 255]
): Tensor {
  const {data} = imageData;
  const totalPixels = width * height;
  const float32Data = new Float32Array(3 * totalPixels);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    float32Data[j] = (data[i]! - mean[0]) / std[0];
    float32Data[j + totalPixels] = (data[i + 1]! - mean[1]) / std[1];
    float32Data[j + 2 * totalPixels] = (data[i + 2]! - mean[2]) / std[2];
  }
  return new Tensor('float32', float32Data, [1, 3, height, width]);
}
