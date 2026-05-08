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

import {useQueries} from '@tanstack/react-query';
import {useCallback, useMemo} from 'react';

import {fetchStandardColorSets, indexStandardColorSets} from '~/src/services/color/colors';
import type {
  ColorBrandDefinition,
  ColorType,
  StandardColorSetDefinition,
} from '~/src/services/color/types';

interface Result {
  isLoading: boolean;
  isError: boolean;
  standardColorSets: Map<string, Map<string, StandardColorSetDefinition>>;
}

interface QueryResult {
  isLoading: boolean;
  isError: boolean;
  data?: Map<string, StandardColorSetDefinition>;
}

export function useStandardColorSets(type?: ColorType, brands?: ColorBrandDefinition[]): Result {
  const brandAliases: string[] | undefined = useMemo(
    () => brands?.map(({alias}) => alias),
    [brands]
  );
  const queries = useMemo(
    () =>
      type && brandAliases
        ? brandAliases.map((brandAlias: string) => ({
            queryKey: ['standardColorSets', type, brandAlias],
            queryFn: () => fetchStandardColorSets(type, brandAlias),
            select: indexStandardColorSets,
          }))
        : [],
    [type, brandAliases]
  );
  const combine = useCallback(
    (results: QueryResult[]): Result => ({
      isLoading: results.some(result => result.isLoading),
      isError: results.some(result => result.isError),
      standardColorSets: new Map(
        results
          .map(({data}, i) =>
            data && brandAliases
              ? ([brandAliases[i]!, data] as [string, Map<string, StandardColorSetDefinition>])
              : undefined
          )
          .filter((entry): entry is [string, Map<string, StandardColorSetDefinition>] => !!entry)
      ),
    }),
    [brandAliases]
  );
  return useQueries({queries, combine});
}
