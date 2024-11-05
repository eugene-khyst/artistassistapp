/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
import {useQueries} from '@tanstack/react-query';

import type {ColorType, StandardColorSetDefinition} from '~/src/services/color';
import {fetchStandardColorSets} from '~/src/services/color';

interface Result {
  isLoading: boolean;
  isError: boolean;
  standardColorSets: Map<string, Map<string, StandardColorSetDefinition>>;
}

export function useStandardColorSets(type?: ColorType, brandAliases?: string[]): Result {
  const results: UseQueryResult<[string, Map<string, StandardColorSetDefinition>]>[] = useQueries({
    queries:
      type && brandAliases
        ? brandAliases.map((brandAlias: string) => ({
            queryKey: ['standardColorSet', type, brandAlias],
            queryFn: async (): Promise<[string, Map<string, StandardColorSetDefinition>]> => [
              brandAlias,
              await fetchStandardColorSets(type, brandAlias),
            ],
          }))
        : [],
  });
  return {
    isLoading: results.some(result => result.isLoading),
    isError: results.some(result => result.isError),
    standardColorSets: new Map(
      results
        .map(({data}) => data)
        .filter((data): data is [string, Map<string, StandardColorSetDefinition>] => !!data)
    ),
  };
}
