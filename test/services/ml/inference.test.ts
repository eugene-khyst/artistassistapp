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

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const {create} = vi.hoisted(() => ({create: vi.fn()}));

vi.mock('onnxruntime-web/webgpu', () => ({
  env: {wasm: {}},
  InferenceSession: {create},
  Tensor: class {
    constructor(
      readonly type: string,
      readonly data: Float32Array,
      readonly dims: number[]
    ) {}
  },
}));

function fakeSession(run: () => Promise<unknown>) {
  return {
    inputNames: ['input'],
    outputNames: ['output'],
    run: vi.fn(run),
    release: vi.fn(() => Promise.resolve()),
  };
}

const output = {output: {data: new Float32Array([1, 2]), dims: [1, 2]}};
const input = [[{data: new Float32Array([0, 0]), dims: [1, 2]}]];
const model = new Uint8Array([1, 2, 3]);

async function createRunner(webGpuEnabled = true) {
  const {InferenceRunner} = await import('@/services/ml/inference');
  const runner = new InferenceRunner();
  await runner.createInferenceSession(model, webGpuEnabled);
  return runner;
}

function stubAdapter(adapter: unknown) {
  vi.stubGlobal('navigator', {gpu: {requestAdapter: () => Promise.resolve(adapter)}});
}

const executionProviders = () =>
  create.mock.calls.map(
    ([, options]) => (options as {executionProviders: string[]}).executionProviders
  );

describe('inference runner', () => {
  beforeEach(() => {
    vi.resetModules();
    create.mockReset();
    vi.stubGlobal('self', {location: {href: 'http://localhost/worker.js'}});
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses WebAssembly when the browser has no WebGPU', async () => {
    vi.stubGlobal('navigator', {});
    create.mockResolvedValue(fakeSession(() => Promise.resolve(output)));

    await createRunner();

    expect(executionProviders()).toEqual([['wasm']]);
  });

  it('uses WebGPU on a hardware adapter', async () => {
    stubAdapter({info: {isFallbackAdapter: false}});
    create.mockResolvedValue(fakeSession(() => Promise.resolve(output)));

    await createRunner();

    expect(executionProviders()).toEqual([['webgpu']]);
  });

  it('uses WebAssembly on a hardware adapter when WebGPU is turned off', async () => {
    stubAdapter({info: {isFallbackAdapter: false}});
    create.mockResolvedValue(fakeSession(() => Promise.resolve(output)));

    await createRunner(false);

    expect(executionProviders()).toEqual([['wasm']]);
  });

  it('uses WebAssembly on a software adapter', async () => {
    stubAdapter({info: {isFallbackAdapter: true}});
    create.mockResolvedValue(fakeSession(() => Promise.resolve(output)));

    await createRunner();

    expect(executionProviders()).toEqual([['wasm']]);
  });

  it('falls back to WebAssembly when the WebGPU session cannot be created', async () => {
    stubAdapter({info: {isFallbackAdapter: false}});
    create
      .mockRejectedValueOnce(new Error('device lost'))
      .mockResolvedValue(fakeSession(() => Promise.resolve(output)));

    const runner = await createRunner();

    expect(executionProviders()).toEqual([['webgpu'], ['wasm']]);
    expect(create).toHaveBeenLastCalledWith(model, expect.anything());
    await expect(runner.runInference(input)).resolves.toEqual({
      outputTensors: [output.output],
    });
  });

  it('propagates a WebGPU run failure without retrying and allows session cleanup', async () => {
    stubAdapter({info: {isFallbackAdapter: false}});
    const error = new Error('out of memory');
    const webGpuSession = fakeSession(() => Promise.reject(error));
    create.mockResolvedValue(webGpuSession);

    const runner = await createRunner();

    await expect(runner.runInference([input[0]!, input[0]!])).rejects.toMatchObject({
      name: 'WebGpuInferenceError',
      message: error.message,
      cause: error,
    });
    expect(executionProviders()).toEqual([['webgpu']]);
    expect(webGpuSession.run).toHaveBeenCalledExactlyOnceWith({
      input: {type: 'float32', ...input[0]![0]!},
    });
    await runner.releaseInferenceSession();
    expect(webGpuSession.release).toHaveBeenCalledOnce();
    await expect(runner.runInference(input)).rejects.toThrow('Inference session is not created');
  });

  it('does not retry a WebAssembly failure', async () => {
    vi.stubGlobal('navigator', {});
    const error = new Error('bad input');
    create.mockResolvedValue(fakeSession(() => Promise.reject(error)));

    const runner = await createRunner();

    await expect(runner.runInference(input)).rejects.toBe(error);
    expect(create).toHaveBeenCalledOnce();
  });

  it('preserves a WebAssembly run error after WebGPU session creation fails', async () => {
    stubAdapter({info: {isFallbackAdapter: false}});
    const error = new Error('bad input');
    create
      .mockRejectedValueOnce(new Error('device lost'))
      .mockResolvedValue(fakeSession(() => Promise.reject(error)));

    const runner = await createRunner();

    await expect(runner.runInference(input)).rejects.toBe(error);
    expect(executionProviders()).toEqual([['webgpu'], ['wasm']]);
  });

  it('does not classify output validation errors as WebGPU run failures', async () => {
    stubAdapter({info: {isFallbackAdapter: false}});
    create.mockResolvedValue(fakeSession(() => Promise.resolve({})));

    const runner = await createRunner();

    await expect(runner.runInference(input)).rejects.toMatchObject({
      name: 'Error',
      message: 'Output tensor is undefined',
    });
  });
});
