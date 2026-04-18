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

import {type ColorChannelOrdering, type OnnxModel, PostProcessing} from '~/src/services/ml/types';
import {clamp} from '~/src/utils/math-utils';

export interface Float32Tensor {
  data: Float32Array;
  dims: readonly number[];
}

const CHANNEL_MAP: Record<ColorChannelOrdering, [number, number, number]> = {
  RGB: [0, 1, 2],
  BGR: [2, 1, 0],
};

const POST_PROCESSING: Record<
  PostProcessing,
  (value: number, channel: number, model: OnnxModel) => number
> = {
  [PostProcessing.MeanStdNormalization]: (
    value,
    c,
    {standardDeviation = [1, 1, 1], mean = [0, 0, 0]}
  ) => value * standardDeviation[c]! + mean[c]!,
  [PostProcessing.Invert]: value => 1.0 - value,
  [PostProcessing.ScaleTo255]: value => clamp(255 * value, 0, 255),
};

export function imageDataToFloat32Tensor(
  {data, width, height}: ImageData,
  {colorChannelOrdering = 'RGB', standardDeviation = [1, 1, 1], mean = [0, 0, 0]}: OnnxModel
): Float32Tensor {
  const channelMap = CHANNEL_MAP[colorChannelOrdering];
  const pixelCount = width * height;
  const float32Data = new Float32Array(3 * pixelCount);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    for (let c = 0; c < 3; c++) {
      const value = data[i + channelMap[c]!]!;
      float32Data[j + c * pixelCount] = (value - mean[c]!) / standardDeviation[c]!;
    }
  }
  return {
    data: float32Data,
    dims: [1, 3, height, width],
  };
}

export function float32TensorToImageData(
  {data, dims: [_batch, channels, height, width]}: Float32Tensor,
  model: OnnxModel
): ImageData {
  const {colorChannelOrdering = 'RGB', postProcessing = [PostProcessing.MeanStdNormalization]} =
    model;
  const channelMap = CHANNEL_MAP[colorChannelOrdering];
  const pixelCount = width! * height!;
  const imageData = new Uint8ClampedArray(4 * pixelCount);
  for (let y = 0; y < height!; y++) {
    for (let x = 0; x < width!; x++) {
      const i = y * width! + x;
      const j = 4 * i;
      for (let c = 0; c < 3; c++) {
        const offset = channels! > 1 ? channelMap[c]! : 0;
        let value = data[i + offset * pixelCount]!;
        for (const p of postProcessing) {
          value = POST_PROCESSING[p](value, c, model);
        }
        imageData[j + c] = value;
      }
      imageData[j + 3] = 255;
    }
  }
  return new ImageData(imageData, width!, height);
}

export function getFloat32TensorTransferables(tensors: Float32Tensor[][]) {
  const transferables: ArrayBufferLike[] = [];
  tensors.forEach(tensorGroup => {
    tensorGroup.forEach(tensor => {
      if (tensor.data instanceof Float32Array) {
        transferables.push(tensor.data.buffer);
      }
    });
  });
  return transferables;
}
