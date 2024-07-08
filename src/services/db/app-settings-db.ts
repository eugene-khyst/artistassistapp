/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {dbPromise} from './db';
import type {AppSettings} from './types';

const KEY = 0;

export async function getAppSettings(): Promise<AppSettings> {
  const db = await dbPromise;
  return (await db.get('app-settings', KEY)) || {};
}

export async function saveAppSettings(partialAppSettings: Partial<AppSettings>): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction('app-settings', 'readwrite');
  const appSettings = await tx.store.get(KEY);
  await tx.store.put({...appSettings, ...partialAppSettings}, KEY);
  await tx.done;
}
