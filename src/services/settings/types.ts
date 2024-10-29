/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {TabKey} from '~/src/tabs';

export interface AppSettings {
  activeTabKey?: TabKey;
  colorPickerDiameter?: number;
}
