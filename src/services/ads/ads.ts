/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {API_URL} from '~/src/config';
import type {AdsDefinition} from '~/src/services/ads/types';
import {fetchSWR} from '~/src/utils';

export async function fetchAds(): Promise<AdsDefinition> {
  const response = await fetchSWR(`${API_URL}/ads.json`);
  return (await response.json()) as AdsDefinition;
}
