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

import {DATA_URL} from '~/src/config';
import type {User} from '~/src/services/auth/types';
import type {OnnxModel, OnnxModelType} from '~/src/services/ml/types';
import {
  byBoolean,
  byNumber,
  byString,
  type Comparator,
  compare,
  reverseOrder,
} from '~/src/utils/comparator';
import {fetchSWR} from '~/src/utils/fetch';

export async function fetchOnnxModels(type: OnnxModelType): Promise<Map<string, OnnxModel>> {
  const response = await fetchSWR(`${DATA_URL}/ml-models/${type}.json`);
  const models = (await response.json()) as OnnxModel[];
  return new Map(models.map((model: OnnxModel) => [model.id, model]));
}

export function getDefaultModel(
  models?: Map<string, OnnxModel>,
  user?: User,
  predicate: (model: OnnxModel) => boolean = () => true
): OnnxModel | undefined {
  if (!models) {
    return;
  }
  const [model] = [...models.values()]
    .filter(model => predicate(model))
    .sort(compareOnnxModelsByPriority({prioritizeFreeTier: !user}));
  return model;
}

export const compareOnnxModelsByPriority = ({
  prioritizeFreeTier,
}: {
  prioritizeFreeTier: boolean;
}): Comparator<OnnxModel> =>
  compare(
    prioritizeFreeTier && reverseOrder(byBoolean(({freeTier}) => freeTier)),
    reverseOrder(byNumber(({priority}) => priority)),
    byString(({name}) => name)
  );
