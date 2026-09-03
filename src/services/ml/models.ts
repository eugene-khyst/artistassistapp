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

import {DATA_METADATA_TIMEOUT_MS, DATA_URL, FILES_URL} from '@/config';
import type {Authentication} from '@/services/auth/types';
import type {OnnxModel, OnnxModelType} from '@/services/ml/types';
import {fetchChunked, type FetchProgressCallback, fetchSWR} from '@/utils/fetch';

export async function fetchOnnxModels(type: OnnxModelType): Promise<OnnxModel[]> {
  const response = await fetchSWR(
    new Request(`${DATA_URL}/ml-models/${type}.json`, {
      signal: AbortSignal.timeout(DATA_METADATA_TIMEOUT_MS),
    })
  );
  return (await response.json()) as OnnxModel[];
}

export async function fetchOnnxModelBuffer(
  modelUrl: string,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const modelResponse: Response = await fetchChunked(new URL(modelUrl, FILES_URL), auth, {
    progressCallback,
    signal,
  });
  return await modelResponse.arrayBuffer();
}
