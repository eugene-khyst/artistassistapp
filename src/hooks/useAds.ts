/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {UseQueryResult, useQuery} from '@tanstack/react-query';
import {useContext} from 'react';
import {AppConfig, AppConfigContext} from '~/src/context/AppConfigContext';
import {AdsDefinition, fetchAds} from '~/src/services/ads';

interface Result {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  ads: AdsDefinition | undefined;
}

export function useAds(): Result {
  const {adsUrl} = useContext<AppConfig>(AppConfigContext);
  const {isLoading, isError, error, data}: UseQueryResult<AdsDefinition> = useQuery({
    queryKey: ['ads'],
    queryFn: async () => await fetchAds(adsUrl),
  });
  return {
    isLoading,
    isError,
    error,
    ads: data,
  };
}
