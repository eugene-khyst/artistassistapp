/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {UseQueryResult, useQueries} from '@tanstack/react-query';
import {Paint, PaintBrand, PaintType, fetchPaints} from '~/src/services/color';

interface Result {
  isLoading: boolean;
  isError: boolean;
  errors: unknown[];
  paints: Map<PaintBrand, Map<number, Paint>>;
}

export function usePaints(type?: PaintType, brands?: PaintBrand[]): Result {
  const results: UseQueryResult<[PaintBrand, Map<number, Paint>]>[] = useQueries({
    queries:
      type && brands
        ? brands.map((brand: PaintBrand) => ({
            queryKey: ['paints', type, brand],
            queryFn: async (): Promise<[PaintBrand, Map<number, Paint>]> => [
              brand,
              await fetchPaints(type, brand),
            ],
          }))
        : [],
  });
  return {
    isLoading: results.some(result => result.isLoading),
    isError: results.some(result => result.isError),
    errors: results.map(({error}) => error),
    paints: new Map(results.flatMap(({data}) => (!data ? [] : [data]))),
  };
}
