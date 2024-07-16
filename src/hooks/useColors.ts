/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {UseQueryResult} from '@tanstack/react-query';
import {useQueries} from '@tanstack/react-query';

import type {ColorDefinition, ColorType} from '~/src/services/color';
import {fetchColors} from '~/src/services/color';

interface Result {
  isLoading: boolean;
  isError: boolean;
  colors: Map<string, Map<number, ColorDefinition>>;
}

export function useColors(type?: ColorType, brandAliases?: string[]): Result {
  const results: UseQueryResult<[string, Map<number, ColorDefinition>]>[] = useQueries({
    queries:
      type && brandAliases
        ? brandAliases.map((brandAlias: string) => ({
            queryKey: ['colors', type, brandAlias],
            queryFn: async (): Promise<[string, Map<number, ColorDefinition>]> => [
              brandAlias,
              await fetchColors(type, brandAlias),
            ],
          }))
        : [],
  });
  return {
    isLoading: results.some(result => result.isLoading),
    isError: results.some(result => result.isError),
    colors: new Map(
      results
        .map(({data}) => data)
        .filter((data): data is [string, Map<number, ColorDefinition>] => !!data)
    ),
  };
}
