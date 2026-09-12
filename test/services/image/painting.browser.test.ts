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

import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {renderBrushStrokesWebGL} from '@/services/image/filter/brush-stroke-webgl';
import {paintImage, PAINTING_PATCH_SIZES, type PaintingPatchSize} from '@/services/image/painting';
import type {Float32Tensor} from '@/services/ml/tensor';
import type {OnnxModel} from '@/services/ml/types';
import type {InferenceRun} from '@/services/ml/worker/inference-worker-manager';
import {PROCESSING_PROGRESS_KEY} from '@/utils/fetch';

import {createImage} from './filter/fixtures';

const mocks = vi.hoisted(() => ({
  run: vi.fn<InferenceRun>(),
  session: vi.fn(),
  render: vi.fn<typeof renderBrushStrokesWebGL>(),
}));
vi.mock('@/services/ml/worker/inference-worker-manager', () => ({
  withInferenceSession: mocks.session,
  runInferenceWorker: vi.fn(),
}));
vi.mock('@/services/image/filter/brush-stroke-webgl', () => ({
  renderBrushStrokesWebGL: mocks.render,
}));

const model: OnnxModel = {
  id: 'mamba-painter',
  url: '/onnx/painting/mamba-painter.onnx',
  resolution: 128,
  standardDeviation: [255, 255, 255],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockImplementation(
    async (_url: string, _auth: unknown, callback: (run: InferenceRun) => Promise<void>) => {
      await callback(mocks.run);
    }
  );
  mocks.run.mockImplementation(async () => [
    {
      data: new Float32Array(800),
      dims: [1, 100, 8],
    },
  ]);
  mocks.render.mockImplementation(
    (_strokes: Float32Tensor[], _brushes: unknown, size: {width: number; height: number}) =>
      new OffscreenCanvas(size.width, size.height)
  );
});

describe('painting inference', () => {
  it.each([
    [PAINTING_PATCH_SIZES.small, 12],
    [PAINTING_PATCH_SIZES.medium, 24],
    [PAINTING_PATCH_SIZES.large, 40],
  ] as const)(
    'downscales to 512 px and uses patch size %i for %i complete predictions',
    async (patchSize: PaintingPatchSize, count) => {
      const image = createImage(1024, 640, () => [96, 128, 192, 255]);
      await paintImage(image, model, null, patchSize);
      expect(mocks.run).toHaveBeenCalledTimes(count);
      const [strokes, , size, geometry] = mocks.render.mock.calls[0]!;
      expect(strokes).toHaveLength(count);
      expect([size.width, size.height]).toEqual([512, 320]);
      expect(geometry).toEqual({patchSize, overlap: patchSize / 2, strokeScale: 0.75});
      for (const [inputs] of mocks.run.mock.calls) {
        expect(inputs[0]![0]!.dims).toEqual([1, 3, 128, 128]);
      }
    }
  );

  it('runs padded patches in one session with RGB values normalized to [0, 1]', async () => {
    const image = createImage(65, 33, () => [255, 128, 64, 255]);
    const progress = vi.fn();
    const controller = new AbortController();
    const output = await paintImage(image, model, null, 64, progress, controller.signal);
    expect([output.width, output.height]).toEqual([65, 33]);
    expect(mocks.session).toHaveBeenCalledExactlyOnceWith(
      model.url,
      null,
      expect.any(Function),
      progress,
      controller.signal
    );
    expect(mocks.run).toHaveBeenCalledTimes(2);
    for (const [inputs, outputName] of mocks.run.mock.calls) {
      const tensor = inputs[0]![0]!;
      expect(tensor.dims).toEqual([1, 3, 128, 128]);
      expect(outputName).toBeUndefined();
      const plane = 128 * 128;
      expect([...tensor.data.subarray(0, plane)].every(value => value === 1)).toBe(true);
      expect(
        [...tensor.data.subarray(plane, 2 * plane)].every(
          value => Math.abs(value - 128 / 255) < 1e-7
        )
      ).toBe(true);
      expect(
        [...tensor.data.subarray(2 * plane)].every(value => Math.abs(value - 64 / 255) < 1e-7)
      ).toBe(true);
    }
    expect(progress).toHaveBeenNthCalledWith(1, PROCESSING_PROGRESS_KEY, 0);
    expect(progress).toHaveBeenNthCalledWith(2, PROCESSING_PROGRESS_KEY, 50);
    expect(mocks.render).toHaveBeenCalledOnce();
    const [strokes, {vertical, horizontal}, size, geometry] = mocks.render.mock.calls[0]!;
    expect(strokes.map(({dims}) => dims)).toEqual([
      [1, 100, 8],
      [1, 100, 8],
    ]);
    expect([vertical.width, horizontal.width]).toEqual([394, 394]);
    expect([size.width, size.height]).toEqual([65, 33]);
    expect(geometry).toEqual({patchSize: 64, overlap: 32, strokeScale: 0.75});
  });

  it('composites transparent source pixels onto white before inference', async () => {
    const image = createImage(32, 32, () => [0, 0, 0, 0]);
    await paintImage(image, model, null);
    const tensor = mocks.run.mock.calls[0]![0][0]![0]!;
    expect([...tensor.data].every(value => value === 1)).toBe(true);
  });

  it('stops before the next patch when canceled', async () => {
    const controller = new AbortController();
    mocks.run.mockImplementation(async () => {
      controller.abort();
      return [{data: new Float32Array(800), dims: [1, 100, 8]}];
    });
    await expect(
      paintImage(
        createImage(128, 64, () => [0, 0, 0, 255]),
        model,
        null,
        64,
        undefined,
        controller.signal
      )
    ).rejects.toMatchObject({name: 'AbortError'});
    expect(mocks.run).toHaveBeenCalledTimes(1);
    expect(mocks.render).not.toHaveBeenCalled();
  });

  it('rejects missing stroke output', async () => {
    mocks.run.mockResolvedValue([]);
    await expect(
      paintImage(
        createImage(64, 64, () => [0, 0, 0, 255]),
        model,
        null
      )
    ).rejects.toThrow('no strokes');
    expect(mocks.render).not.toHaveBeenCalled();
  });
});
