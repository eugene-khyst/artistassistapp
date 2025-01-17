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

export function imageDataToTensor(
  {data, width, height}: ImageData,
  standardDeviation?: [number, number, number],
  mean?: [number, number, number]
): Tensor {
  const totalPixels = width * height;
  const float32Data = new Float32Array(3 * totalPixels);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    for (let c = 0; c < 3; c++) {
      float32Data[j + c * totalPixels] =
        (data[i + c]! - (mean?.[c] ?? 0)) / (standardDeviation?.[c] ?? 1);
    }
  }
  return new Tensor('float32', float32Data, [1, 3, height, width]);
}

export function tensorToImageData(
  {data, dims: [_batch, channels, height, width]}: Tensor,
  standardDeviation?: [number, number, number]
): ImageData {
  const totalPixels = width! * height!;
  const imageData = new Uint8ClampedArray(4 * totalPixels);
  for (let y = 0; y < height!; y++) {
    for (let x = 0; x < width!; x++) {
      const i = y * width! + x;
      const j = 4 * i;
      for (let c = 0; c < 3; c++) {
        const offset = channels! > 1 ? c : 0;
        imageData[j + c] =
          (data[i + offset * totalPixels] as number) * (standardDeviation?.[c] ?? 1);
      }
      imageData[j + 3] = 255;
    }
  }
  return new ImageData(imageData, width!, height!);
}
