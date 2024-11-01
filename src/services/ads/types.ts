/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AdDefinition {
  image?: string;
  text: string;
  linkText: string;
  linkUrl?: string;
  linkTab?: string;
}

export interface AdsDefinition {
  ads: Record<string, AdDefinition>;
  placements: Record<string, string[]>;
}
