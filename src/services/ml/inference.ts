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

import type {Tensor} from 'onnxruntime-web';
import {env, InferenceSession} from 'onnxruntime-web';

import type {ProgressCallback} from '~/src/utils/fetch';
import {fetchChunked} from '~/src/utils/fetch';

env.wasm.proxy = true;
env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';

export async function runInference(
  modelUrl: string,
  inputTensors: Tensor[],
  progressCallback?: ProgressCallback
): Promise<Tensor[]> {
  const modelResponse: Response = await fetchChunked(new URL(modelUrl), progressCallback);
  const modelBlob: Blob = await modelResponse.blob();
  modelUrl = URL.createObjectURL(modelBlob);
  const outputTensors: Tensor[] = [];
  try {
    progressCallback?.('Inference', 'auto');
    const session = await InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      executionMode: 'parallel',
      enableCpuMemArena: true,
    });
    let i = 1;
    for (const inputTensor of inputTensors) {
      progressCallback?.(`Inference ${i}`, 'auto');
      const feeds: InferenceSession.FeedsType = {[session.inputNames[0]!]: inputTensor};
      const results = await session.run(feeds);
      const outputTensor = results[session.outputNames[0]!];
      if (!outputTensor) {
        throw new Error('Output tensor is undefined');
      }
      outputTensors.push(outputTensor);
      i++;
    }
    await session.release();
  } finally {
    URL.revokeObjectURL(modelUrl);
  }
  return outputTensors;
}
