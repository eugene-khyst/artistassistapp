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

import type {UseQueryResult} from '@tanstack/react-query';
import {useQuery} from '@tanstack/react-query';
import {useCallback} from 'react';

import {fetchOnnxModels} from '~/src/services/ml/models';
import type {OnnxModel, OnnxModelType} from '~/src/services/ml/types';

export function useOnnxModel(type: OnnxModelType, id: string | undefined) {
  const {isLoading, isError, error, data}: UseQueryResult<OnnxModel | undefined> = useQuery({
    queryKey: ['ml-models', type],
    queryFn: () => fetchOnnxModels(type),
    enabled: !!id,
    select: useCallback(
      (models: OnnxModel[]) => (id ? models.find(model => model.id === id) : undefined),
      [id]
    ),
  });
  return {
    isLoading,
    isError,
    error,
    model: data,
  };
}
