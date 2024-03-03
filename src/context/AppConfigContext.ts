/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Context, createContext} from 'react';

export interface AppConfig {
  websiteUrl: string;
  quickStartUrl: string;
  watermarkText: string;
}

export const AppConfigContext: Context<AppConfig> = createContext<AppConfig>({
  websiteUrl: 'https://artistassistapp.com',
  quickStartUrl: 'https://artistassistapp.com/en/tutorials/',
  watermarkText: 'ArtistAssistApp.com',
});
