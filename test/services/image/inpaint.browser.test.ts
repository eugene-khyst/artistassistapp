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

import {afterEach, expect, it, vi} from 'vitest';

import {inpaintImage} from '@/services/image/inpaint';
import {Vector} from '@/services/math/geometry';
import {PreProcessing} from '@/services/ml/types';
import {runInferenceWorker} from '@/services/ml/worker/inference-worker-manager';
import {createPolygonMask, offscreenCanvasToImageData} from '@/utils/graphics';

vi.mock('@/services/ml/worker/inference-worker-manager', () => ({
  runInferenceWorker: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

it.each([
  {inpaintWebGpu: false, upscaleWebGpu: undefined},
  {inpaintWebGpu: undefined, upscaleWebGpu: false},
  {inpaintWebGpu: true, upscaleWebGpu: true},
])('honors each model’s WebGPU setting: %j', async ({inpaintWebGpu, upscaleWebGpu}) => {
  const image = new OffscreenCanvas(32, 32);
  const ctx = image.getContext('2d')!;
  ctx.fillStyle = 'rgb(80, 120, 160)';
  ctx.fillRect(0, 0, 32, 32);
  const mask = createPolygonMask(
    [new Vector(8, 8), new Vector(24, 8), new Vector(24, 24), new Vector(8, 24)],
    image
  );
  const run = vi.mocked(runInferenceWorker);
  run.mockImplementation(async ({inputTensors}) => [inputTensors[0]![0]!]);
  const signal = new AbortController().signal;
  const progressCallback = vi.fn();

  const result = await inpaintImage({
    images: [image, mask],
    target: image,
    inpaintModel: {
      id: 'inpaint',
      url: '/inpaint.onnx',
      resolution: 16,
      webGpu: inpaintWebGpu,
      colorChannelOrdering: {input: ['RGB', 'R'], output: 'RGB'},
      preProcessing: [[], [PreProcessing.Binarize]],
      postProcessing: [],
    },
    upscaleModel: {id: 'upscale', url: '/upscale.onnx', webGpu: upscaleWebGpu},
    auth: null,
    progressCallback,
    signal,
  });

  expect(run.mock.calls.map(([{modelUrl, allowWebGpu}]) => [modelUrl, allowWebGpu])).toEqual([
    ['/inpaint.onnx', inpaintWebGpu],
    ['/upscale.onnx', upscaleWebGpu],
  ]);
  const [imageTensor, maskTensor] = run.mock.calls[0]![0].inputTensors[0]!;
  expect(imageTensor!.dims).toEqual([1, 3, 16, 16]);
  expect(maskTensor!.dims).toEqual([1, 1, 16, 16]);
  expect(maskTensor!.data[0]).toBe(0);
  expect(maskTensor!.data[8 * 16 + 8]).toBe(1);
  expect(result.width).toBe(32);
  expect(result.height).toBe(32);
  const {data} = offscreenCanvasToImageData(result);
  expect([...data.slice((16 * 32 + 16) * 4, (16 * 32 + 16) * 4 + 4)]).toEqual([80, 120, 160, 255]);
});
