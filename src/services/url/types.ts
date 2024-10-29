/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ColorSetDefinition} from '~/src/services/color';
import type {TabKey} from '~/src/tabs';

export interface UrlParsingResult {
  colorSet?: ColorSetDefinition;
  tabKey?: TabKey;
}
