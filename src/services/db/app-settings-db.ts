/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type {AppSettings} from '~/src/services/settings/types';

import {dbPromise} from './db';

type AppSettingsUpdater = (prev?: AppSettings) => Partial<AppSettings>;

const KEY = 0;

export async function getAppSettings(): Promise<AppSettings | undefined> {
  const db = await dbPromise;
  return await db.get('app-settings', KEY);
}

export async function saveAppSettings(
  appSettings: Partial<AppSettings> | AppSettingsUpdater
): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction('app-settings', 'readwrite');
  const currentAppSettings = await tx.store.get(KEY);
  let newAppSettings: Partial<AppSettings>;
  if (typeof appSettings === 'function') {
    newAppSettings = (appSettings as AppSettingsUpdater)(currentAppSettings);
  } else {
    newAppSettings = appSettings;
  }
  await tx.store.put(
    {
      ...currentAppSettings,
      ...newAppSettings,
    },
    KEY
  );
  await tx.done;
}
