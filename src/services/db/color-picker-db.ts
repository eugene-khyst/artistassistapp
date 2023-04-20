/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ColorPickerSettings} from '../color';
import {dbPromise} from './db';

export async function getColorPickerSettings(): Promise<ColorPickerSettings | undefined> {
  return (await dbPromise).get('color-picker', 0);
}

export async function saveColorPickerSettings(
  colorPickerSettings: ColorPickerSettings
): Promise<void> {
  (await dbPromise).put('color-picker', colorPickerSettings, 0);
}
