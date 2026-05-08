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

import {fetchColors, indexColors} from '~/src/services/color/colors';
import type {ColorBrandDefinition, ColorDefinition, ColorType} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';

interface Result {
  isLoading: boolean;
  isError: boolean;
  colors: Map<string, Map<number, ColorDefinition>>;
}

interface QueryResult {
  isLoading: boolean;
  isError: boolean;
  data?: Map<number, ColorDefinition>;
}

export function useColors(type?: ColorType, brands?: ColorBrandDefinition[]): Result {
  const auth = useAppStore(state => state.auth);

  const brandAliases: string[] | undefined = useMemo(
    () => brands?.map(({alias}) => alias),
    [brands]
  );

  const queries = useMemo(
    () =>
      type && brandAliases
        ? brandAliases.map((brandAlias: string) => ({
            queryKey: ['colors', type, brandAlias, auth?.user.id ?? null],
            queryFn: () => fetchColors(type, brandAlias, auth),
            select: indexColors,
          }))
        : [],
    [type, brandAliases, auth]
  );

  const combine = useCallback(
    (results: QueryResult[]): Result => ({
      isLoading: results.some(result => result.isLoading),
      isError: results.some(result => result.isError),
      colors: new Map(
        results
          .map(({data}, i) =>
            data && brandAliases
              ? ([brandAliases[i]!, data] as [string, Map<number, ColorDefinition>])
              : undefined
          )
          .filter((entry): entry is [string, Map<number, ColorDefinition>] => !!entry)
      ),
    }),
    [brandAliases]
  );

  return useQueries({queries, combine});
}
