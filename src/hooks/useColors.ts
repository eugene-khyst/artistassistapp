/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {UseQueryResult} from '@tanstack/react-query';
import {useQueries} from '@tanstack/react-query';

import type {Color, ColorBrand, ColorType} from '~/src/services/color';
import {fetchColors} from '~/src/services/color';

interface Result {
  isLoading: boolean;
  isError: boolean;
  errors: unknown[];
  colors: Map<ColorBrand, Map<number, Color>>;
}

export function useColors(type?: ColorType, brands?: ColorBrand[]): Result {
  const results: UseQueryResult<[ColorBrand, Map<number, Color>]>[] = useQueries({
    queries:
      type && brands
        ? brands.map((brand: ColorBrand) => ({
            queryKey: ['colors', type, brand],
            queryFn: async (): Promise<[ColorBrand, Map<number, Color>]> => [
              brand,
              await fetchColors(type, brand),
            ],
          }))
        : [],
  });
  return {
    isLoading: results.some(result => result.isLoading),
    isError: results.some(result => result.isError),
    errors: results.map(({error}) => error),
    colors: new Map(results.flatMap(({data}) => (!data ? [] : [data]))),
  };
}
