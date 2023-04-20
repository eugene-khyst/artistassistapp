/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Context, createContext} from 'react';

export interface AppConfig {
  websiteUrl: string;
  limitResultsForMixes: number;
  sampleMaxSize: number;
  sampleSizeSliderMarkValues: number[];
}

export const AppConfigContext: Context<AppConfig> = createContext<AppConfig>({
  websiteUrl: 'https://www.artistassistapp.com',
  limitResultsForMixes: 5,
  sampleMaxSize: 50,
  sampleSizeSliderMarkValues: [1, 10, 20, 30, 40, 50],
});
