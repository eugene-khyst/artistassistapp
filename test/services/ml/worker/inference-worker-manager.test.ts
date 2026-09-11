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

import {WebGpuInferenceError} from '@/services/ml/errors';
import {withInferenceSession} from '@/services/ml/worker/inference-worker-manager';

const {remote} = vi.hoisted(() => ({
  remote: {
    createInferenceSession: vi.fn(),
    runInference: vi.fn(),
    releaseInferenceSession: vi.fn(),
  },
}));

vi.mock('@/utils/worker-manager', () => ({
  WorkerManager: class {
    run<R>(operation: (worker: typeof remote) => Promise<R>): Promise<R> {
      return operation(remote);
    }
    terminate = vi.fn();
  },
}));
vi.mock('@/services/ml/models', () => ({
  fetchOnnxModelBuffer: vi.fn(() => Promise.resolve(new ArrayBuffer(4))),
}));
vi.mock('@/services/db/app-settings-db', () => ({
  getAppSettings: vi.fn(() => Promise.resolve(undefined)),
}));

const input = [[{data: new Float32Array([0, 0]), dims: [1, 2]}]];

function runOnce() {
  return withInferenceSession('/model.onnx', null, run => run(input));
}

describe('inference session', () => {
  beforeEach(() => {
    remote.createInferenceSession.mockResolvedValue(undefined);
    remote.releaseInferenceSession.mockResolvedValue(undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it('returns the inference result and releases the session', async () => {
    const outputTensors = [{data: new Float32Array([1, 2]), dims: [1, 2]}];
    remote.runInference.mockResolvedValue({outputTensors});

    await expect(runOnce()).resolves.toEqual(outputTensors);

    expect(remote.createInferenceSession).toHaveBeenCalledWith(expect.any(Uint8Array), true);
    expect(remote.releaseInferenceSession).toHaveBeenCalledOnce();
  });

  it('keeps the inference error when releasing the session also fails', async () => {
    const inferenceError = new WebGpuInferenceError(new Error('device lost'));
    remote.runInference.mockRejectedValue(inferenceError);
    remote.releaseInferenceSession.mockRejectedValue(new Error('release failed'));

    await expect(runOnce()).rejects.toBe(inferenceError);

    expect(remote.releaseInferenceSession).toHaveBeenCalledOnce();
  });

  it('reports a release failure after a successful inference', async () => {
    remote.runInference.mockResolvedValue({outputTensors: []});
    remote.releaseInferenceSession.mockRejectedValue(new Error('release failed'));

    await expect(runOnce()).rejects.toThrow('release failed');
  });
});
