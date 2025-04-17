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

import {DATA_URL} from '~/src/config';
import type {OnnxModel, OnnxModelType} from '~/src/services/ml/types';
import {fetchSWR} from '~/src/utils/fetch';

export async function fetchOnnxModels(type: OnnxModelType): Promise<Map<string, OnnxModel>> {
  const response = await fetchSWR(`${DATA_URL}/ml-models/${type}.json`);
  const models = (await response.json()) as OnnxModel[];
  return new Map(models.map((model: OnnxModel) => [model.id, model]));
}

export const compareOnnxModelsByPriority = (a: OnnxModel, b: OnnxModel) =>
  (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name);

export const compareOnnxModelsByFreeTierAndPriority = (a: OnnxModel, b: OnnxModel) =>
  (a.freeTier ?? false) === (b.freeTier ?? false)
    ? compareOnnxModelsByPriority(a, b)
    : a.freeTier
      ? -1
      : 1;
