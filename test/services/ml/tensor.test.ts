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

import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';

import {float32TensorToImageData, imageDataToFloat32Tensor} from '@/services/ml/tensor';
import {PostProcessing} from '@/services/ml/types';

beforeAll(() => {
  vi.stubGlobal(
    'ImageData',
    class ImageData {
      readonly colorSpace = 'srgb';

      constructor(
        readonly data: Uint8ClampedArray,
        readonly width: number,
        readonly height: number
      ) {}
    }
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('ML tensor conversion', () => {
  it('normalizes pixels into ordered planar channels', () => {
    const tensor = imageDataToFloat32Tensor(
      {
        data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]),
        width: 2,
        height: 1,
      } as ImageData,
      {
        id: 'model',
        name: 'Model',
        url: 'model.onnx',
        colorChannelOrdering: 'BGR',
        mean: [1, 2, 3],
        standardDeviation: [1, 2, 5],
      }
    );

    expect(tensor.dims).toEqual([1, 3, 1, 2]);
    for (const [index, expected] of [29, 59, 9, 24, 1.4, 7.4].entries()) {
      expect(tensor.data[index]).toBeCloseTo(expected, 5);
    }
  });

  it('maps BGR output channels and applies post-processing in order', () => {
    const image = float32TensorToImageData(
      {data: new Float32Array([1, 0.5, 0]), dims: [1, 3, 1, 1]},
      {
        id: 'model',
        name: 'Model',
        url: 'model.onnx',
        colorChannelOrdering: 'BGR',
        postProcessing: [PostProcessing.Invert, PostProcessing.ScaleTo255],
      }
    );

    expect([...image.data]).toEqual([255, 128, 0, 255]);
  });

  it('expands a single output channel to grayscale', () => {
    const image = float32TensorToImageData(
      {data: new Float32Array([0.25]), dims: [1, 1, 1, 1]},
      {
        id: 'model',
        name: 'Model',
        url: 'model.onnx',
        postProcessing: [PostProcessing.ScaleTo255],
      }
    );

    expect([...image.data]).toEqual([64, 64, 64, 255]);
  });
});
