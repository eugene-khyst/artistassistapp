/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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
