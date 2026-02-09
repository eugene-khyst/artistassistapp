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

import {transfer} from 'comlink';

import type {InferenceRunner} from '~/src/services/ml/inference';
import {type Float32Tensor, getFloat32TensorTransferables} from '~/src/services/ml/tensor';
import type {FetchProgressCallback} from '~/src/utils/fetch';
import {fetchChunked} from '~/src/utils/fetch';
import {WorkerManager} from '~/src/utils/worker-manager';

const inferenceWorker = new WorkerManager<InferenceRunner>(
  () => new Worker(new URL('./inference-worker.ts', import.meta.url), {type: 'module'})
);

export async function runInferenceWorker(
  modelUrl: string,
  inputTensors: Float32Tensor[][],
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<Float32Tensor[]> {
  const modelResponse: Response = await fetchChunked(new URL(modelUrl), {progressCallback, signal});
  const modelBlob: Blob = await modelResponse.blob();
  modelUrl = URL.createObjectURL(modelBlob);
  try {
    const {outputTensors} = await inferenceWorker.run(
      worker =>
        worker.runInference(
          modelUrl,
          transfer(inputTensors, getFloat32TensorTransferables(inputTensors))
        ),
      signal
    );
    return outputTensors;
  } finally {
    URL.revokeObjectURL(modelUrl);
  }
}
