/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {UseQueryResult} from '@tanstack/react-query';
import {useQuery} from '@tanstack/react-query';

import {type ColorBrandDefinition, type ColorType, fetchColorBrands} from '~/src/services/color';

interface Result {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  brands?: Map<number, ColorBrandDefinition>;
}

export function useColorBrands(type?: ColorType): Result {
  const {isLoading, isError, error, data}: UseQueryResult<Map<number, ColorBrandDefinition>> =
    useQuery({
      queryKey: ['brands', type],
      queryFn: async () => await fetchColorBrands(type!),
      enabled: !!type,
    });
  return {
    isLoading,
    isError,
    error,
    brands: data,
  };
}
