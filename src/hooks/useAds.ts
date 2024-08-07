/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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
