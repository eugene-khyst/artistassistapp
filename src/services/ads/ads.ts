/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AdDefinition {
  image: string;
  text: string;
  linkText: string;
  linkUrl: string;
}

export interface AdsDefinition {
  ads: Record<string, AdDefinition>;
  placements: Record<string, string>;
}

export async function fetchAds(adsUrl: string): Promise<AdsDefinition | undefined> {
  try {
    const response = await fetch(adsUrl);
    return await response.json();
  } catch (e) {
    console.error('Failed to fetch ads', e);
  }
}
