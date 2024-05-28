/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {TabKey} from '~/src/types';

export interface AppSettings {
  activeTabKey?: TabKey;
}

export interface ImageFile {
  id?: number;
  file: File;
  date?: Date;
}

export interface ColorPickerSettings {
  sampleDiameter: number;
}
