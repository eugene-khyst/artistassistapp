/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {apiUrl} from '~/src/config';
import {fetchAndCache} from '~/src/utils';

export interface AdDefinition {
  image: string;
  text: string;
  linkText: string;
  linkUrl?: string;
  linkTab?: string;
}

export interface AdsDefinition {
  ads: Record<string, AdDefinition>;
  placements: Record<string, string[]>;
}

export async function fetchAds(): Promise<AdsDefinition> {
  const response = await fetchAndCache(`${apiUrl}/ads.json`);
  return (await response.json()) as AdsDefinition;
}
