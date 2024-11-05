/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
