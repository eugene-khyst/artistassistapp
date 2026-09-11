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

import {transfer} from 'comlink';

import type {Authentication} from '@/services/auth/types';
import {getAppSettings} from '@/services/db/app-settings-db';
import {type InferenceRunner} from '@/services/ml/inference';
import {fetchOnnxModelBuffer} from '@/services/ml/models';
import {type Float32Tensor, getFloat32TensorTransferables} from '@/services/ml/tensor';
import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import {type FetchProgressCallback} from '@/utils/fetch';
import {anySignal} from '@/utils/promise';
import {WorkerManager} from '@/utils/worker-manager';

const inferenceWorker = new WorkerManager<InferenceRunner>(
  () => new Worker(new URL('./inference-worker.ts', import.meta.url), {type: 'module'})
);

export type InferenceRun = (
  inputTensors: Float32Tensor[][],
  outputName?: string
) => Promise<Float32Tensor[]>;

let abortController: AbortController | null = null;

// The shared worker holds one session, so a new call cancels the inference in flight.
// A nested call cancels the outer session, so the callback must use its run.
export async function withInferenceSession<T>(
  modelUrl: string,
  auth: Authentication | null,
  callback: (run: InferenceRun) => Promise<T>,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<T> {
  if (abortController) {
    abortController.abort();
    inferenceWorker.terminate();
  }
  const controller = new AbortController();
  abortController = controller;
  const sessionSignal = anySignal([signal, controller.signal]);
  let result: T;
  try {
    const modelBuffer = new Uint8Array(
      await fetchOnnxModelBuffer(modelUrl, auth, progressCallback, sessionSignal)
    );
    const {webGpuEnabled} = {...DEFAULT_APP_SETTINGS, ...(await getAppSettings())};
    await inferenceWorker.run(
      worker =>
        worker.createInferenceSession(transfer(modelBuffer, [modelBuffer.buffer]), webGpuEnabled),
      sessionSignal
    );
    result = await callback(async (inputTensors, outputName) => {
      const {outputTensors} = await inferenceWorker.run(
        worker =>
          worker.runInference(
            transfer(inputTensors, getFloat32TensorTransferables(inputTensors)),
            outputName
          ),
        sessionSignal
      );
      return outputTensors;
    });
  } catch (error) {
    try {
      await releaseSession(controller);
    } catch (releaseError) {
      // The inference error must reach the user, for example to offer turning WebGPU off.
      console.warn('Failed to release inference session', releaseError);
    }
    throw error;
  }
  await releaseSession(controller);
  return result;
}

async function releaseSession(controller: AbortController): Promise<void> {
  if (abortController === controller) {
    abortController = null;
    await inferenceWorker.run(worker => worker.releaseInferenceSession());
  }
}

export async function runInferenceWorker(
  modelUrl: string,
  auth: Authentication | null,
  inputTensors: Float32Tensor[][],
  outputName?: string,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<Float32Tensor[]> {
  return await withInferenceSession(
    modelUrl,
    auth,
    run => run(inputTensors, outputName),
    progressCallback,
    signal
  );
}
