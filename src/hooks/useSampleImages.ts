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

import type {UseQueryResult} from '@tanstack/react-query';
import {useQuery} from '@tanstack/react-query';

import {fetchSampleImages, type SampleImageDefinition} from '~/src/services/image/sample-images';

interface Result {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  sampleImages?: SampleImageDefinition[];
}

export function useSampleImages(): Result {
  const {isLoading, isError, error, data}: UseQueryResult<SampleImageDefinition[]> = useQuery({
    queryKey: ['sample-images'],
    queryFn: fetchSampleImages,
  });
  return {
    isLoading,
    isError,
    error,
    sampleImages: data,
  };
}
