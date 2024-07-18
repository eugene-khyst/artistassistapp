/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {AppSettings} from '~/src/services/types';

import {dbPromise} from './db';

const KEY = 0;

export async function getAppSettings(): Promise<AppSettings | undefined> {
  const db = await dbPromise;
  return await db.get('app-settings', KEY);
}

export async function saveAppSettings(appSettings: Partial<AppSettings>): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction('app-settings', 'readwrite');
  const currentAppSettings = await tx.store.get(KEY);
  await tx.store.put(
    {
      ...currentAppSettings,
      ...appSettings,
    },
    KEY
  );
  await tx.done;
}
