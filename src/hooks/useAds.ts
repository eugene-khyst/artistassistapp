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

import type {AdsDefinition} from '~/src/services/ads';
import {fetchAds} from '~/src/services/ads';

interface Result {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  ads?: AdsDefinition;
}

export function useAds(): Result {
  const {isLoading, isError, error, data}: UseQueryResult<AdsDefinition> = useQuery({
    queryKey: ['ads'],
    queryFn: fetchAds,
  });
  return {
    isLoading,
    isError,
    error,
    ads: data,
  };
}
