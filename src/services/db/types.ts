/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ColorPickerSettings {
  sampleDiameter: number;
}

export interface ImageFile {
  id?: number;
  file: File;
  date?: Date;
}
