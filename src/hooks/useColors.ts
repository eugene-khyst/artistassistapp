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

import {
  type ColorBrandDefinition,
  type ColorDefinition,
  type ColorType,
  indexById,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {useQueries} from '@tanstack/react-query';
import {useCallback, useMemo} from 'react';

import {colorsQueryOptions} from '@/services/color/color-queries';
import {useAppStore} from '@/stores/app-store';

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

const indexColors = (colors: ColorDefinition[]): Map<number, ColorDefinition> => indexById(colors);

export function useColors(type?: ColorType, brands?: ColorBrandDefinition[]): Result {
  const auth = useAppStore(state => state.auth);
  const customColorBrandsReloadRevision = useAppStore(
    state => state.customColorBrandsReloadRevision
  );

  const brandAliases: string[] | undefined = useMemo(
    () => brands?.map(({alias}) => alias),
    [brands]
  );

  const queries = useMemo(
    () =>
      type && brandAliases
        ? brandAliases.map((brandAlias: string) => ({
            ...colorsQueryOptions(type, brandAlias, auth, customColorBrandsReloadRevision),
            select: indexColors,
          }))
        : [],
    [type, brandAliases, auth, customColorBrandsReloadRevision]
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
