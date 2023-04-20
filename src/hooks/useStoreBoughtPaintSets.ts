/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {UseQueryResult, useQueries} from '@tanstack/react-query';
import {
  PaintBrand,
  PaintType,
  StoreBoughtPaintSet,
  fetchStoreBoughtPaintSets,
} from '../services/color';

interface Result {
  isLoading: boolean;
  isError: boolean;
  errors: unknown[];
  storeBoughtPaintSets: Map<PaintBrand, Map<string, StoreBoughtPaintSet>>;
}

export function useStoreBoughtPaintSets(type?: PaintType, brands?: PaintBrand[]): Result {
  const results: UseQueryResult<[PaintBrand, Map<string, StoreBoughtPaintSet>]>[] = useQueries({
    queries:
      !!type && !!brands
        ? brands.map((brand: PaintBrand) => ({
            queryKey: ['paintSet', type, brand],
            queryFn: async (): Promise<[PaintBrand, Map<string, StoreBoughtPaintSet>]> => [
              brand,
              await fetchStoreBoughtPaintSets(type, brand),
            ],
          }))
        : [],
  });
  return {
    isLoading: results.some(result => result.isLoading),
    isError: results.some(result => result.isError),
    errors: results.map(({error}) => error),
    storeBoughtPaintSets: new Map(results.flatMap(({data}) => (!data ? [] : [data]))),
  };
}
