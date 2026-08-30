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

import {clamp} from '@eugene-khyst/artistassistapp-color-mixer';

import {
  type ColorChannelOrdering,
  type OnnxModel,
  PostProcessing,
  PreProcessing,
} from '@/services/ml/types';

export interface Float32Tensor {
  data: Float32Array;
  dims: readonly number[];
}

const CHANNEL_MAP: Record<ColorChannelOrdering, number[]> = {
  RGB: [0, 1, 2],
  BGR: [2, 1, 0],
  R: [0],
  A: [3],
};

const PRE_PROCESSING: Record<
  PreProcessing,
  (value: number, channel: number, model: OnnxModel) => number
> = {
  [PreProcessing.MeanStdNormalization]: (
    value,
    c,
    {standardDeviation = [1, 1, 1], mean = [0, 0, 0]}
  ) => (value - mean[c]!) / standardDeviation[c]!,
  [PreProcessing.Binarize]: value => (value > 0 ? 1 : 0),
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

function isPerInputPreProcessing(
  preProcessing: PreProcessing[] | PreProcessing[][]
): preProcessing is PreProcessing[][] {
  return Array.isArray(preProcessing[0]);
}

export function imageDataToFloat32Tensor(
  {data, width, height}: ImageData,
  model: OnnxModel,
  inputIndex = 0
): Float32Tensor {
  const {colorChannelOrdering = 'RGB', preProcessing = [PreProcessing.MeanStdNormalization]} =
    model;
  const inputColorChannelOrdering =
    typeof colorChannelOrdering === 'string'
      ? colorChannelOrdering
      : colorChannelOrdering.input[inputIndex]!;
  const channelMap = CHANNEL_MAP[inputColorChannelOrdering];
  const channels = channelMap.length;
  const pixelCount = width * height;
  const inputPreProcessing = isPerInputPreProcessing(preProcessing)
    ? preProcessing[inputIndex]!
    : preProcessing;
  const float32Data = new Float32Array(channels * pixelCount);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    for (let c = 0; c < channels; c++) {
      let value = data[i + channelMap[c]!]!;
      for (const p of inputPreProcessing) {
        value = PRE_PROCESSING[p](value, c, model);
      }
      float32Data[j + c * pixelCount] = value;
    }
  }
  return {
    data: float32Data,
    dims: [1, channels, height, width],
  };
}

export function float32TensorToImageData(
  {data, dims: [, channels, height, width]}: Float32Tensor,
  model: OnnxModel
): ImageData {
  const {colorChannelOrdering = 'RGB', postProcessing = [PostProcessing.MeanStdNormalization]} =
    model;
  const outputColorChannelOrdering =
    typeof colorChannelOrdering === 'string' ? colorChannelOrdering : colorChannelOrdering.output;
  const channelMap = CHANNEL_MAP[outputColorChannelOrdering];
  const pixelCount = width! * height!;
  const imageData = new Uint8ClampedArray(4 * pixelCount).fill(255);
  for (let y = 0; y < height!; y++) {
    for (let x = 0; x < width!; x++) {
      const i = y * width! + x;
      const j = 4 * i;
      for (let c = 0; c < channelMap.length; c++) {
        let value = data[i + (channels! > 1 ? c : 0) * pixelCount]!;
        for (const p of postProcessing) {
          value = POST_PROCESSING[p](value, c, model);
        }
        imageData[j + channelMap[c]!] = value;
      }
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
