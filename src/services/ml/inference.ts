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
import {env, InferenceSession, Tensor} from 'onnxruntime-web';

import {type Float32Tensor, getFloat32TensorTransferables} from '~/src/services/ml/tensor';

env.wasm.proxy = false;
env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/';

interface Result {
  outputTensors: Float32Tensor[];
}

export class InferenceRunner {
  async runInference(modelUrl: string, inputTensors: Float32Tensor[][]): Promise<Result> {
    const outputTensors: Float32Tensor[] = [];
    const session = await InferenceSession.create(modelUrl, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      executionMode: 'parallel',
    });
    for (const inputTensor of inputTensors) {
      const feeds: InferenceSession.FeedsType = Object.fromEntries(
        inputTensor.map(({data, dims}, index) => [
          session.inputNames[index]!,
          new Tensor('float32', data, dims),
        ])
      );
      const results = await session.run(feeds);
      const outputTensor = results[session.outputNames[0]!];
      if (!outputTensor) {
        throw new Error('Output tensor is undefined');
      }
      const {data, dims} = outputTensor;
      if (!(data instanceof Float32Array)) {
        throw new TypeError(`Expected Float32Array, got ${data.constructor.name || typeof data}`);
      }
      outputTensors.push({
        data,
        dims,
      });
    }
    await session.release();
    return transfer({outputTensors}, getFloat32TensorTransferables([outputTensors]));
  }
}
