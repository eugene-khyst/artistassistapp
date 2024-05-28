/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {UseQueryResult} from '@tanstack/react-query';
import {useQueries} from '@tanstack/react-query';

import type {ColorBrand, ColorType, StandardColorSet} from '~/src/services/color';
import {fetchStandardColorSets} from '~/src/services/color';

interface Result {
  isLoading: boolean;
  isError: boolean;
  standardColorSets: Map<ColorBrand, Map<string, StandardColorSet>>;
}

export function useStandardColorSets(type?: ColorType, brands?: ColorBrand[]): Result {
  const results: UseQueryResult<[ColorBrand, Map<string, StandardColorSet>]>[] = useQueries({
    queries:
      !!type && !!brands
        ? brands.map((brand: ColorBrand) => ({
            queryKey: ['colorSet', type, brand],
            queryFn: async (): Promise<[ColorBrand, Map<string, StandardColorSet>]> => [
              brand,
              await fetchStandardColorSets(type, brand),
            ],
          }))
        : [],
  });
  return {
    isLoading: results.some(result => result.isLoading),
    isError: results.some(result => result.isError),
    standardColorSets: new Map(results.flatMap(({data}) => (!data ? [] : [data]))),
  };
}
