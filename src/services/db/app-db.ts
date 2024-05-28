/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {dbPromise} from './db';
import type {AppSettings} from './types';

export async function getAppSettings(): Promise<AppSettings | undefined> {
  const db = await dbPromise;
  return await db.get('app', 0);
}

export async function saveAppSettings(appSettings: AppSettings): Promise<void> {
  const db = await dbPromise;
  await db.put('app', appSettings, 0);
}
