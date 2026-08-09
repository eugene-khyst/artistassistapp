/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import type {ImageFile} from '@/services/image/image-file';
import {type AppSettings, DEFAULT_APP_SETTINGS} from '@/services/settings/types';

import {dbPromise} from './db';

const KEY = 0;

export async function getStyleImage(): Promise<ImageFile | undefined> {
  const db = await dbPromise;
  return await db.get('style-image', KEY);
}

export async function saveStyleImage(styleImage: ImageFile): Promise<AppSettings> {
  const db = await dbPromise;
  const tx = db.transaction(['app-settings', 'style-image'], 'readwrite');
  const settingsStore = tx.objectStore('app-settings');
  const appSettings = {
    ...DEFAULT_APP_SETTINGS,
    ...(await settingsStore.get(KEY)),
    styleTransferImageDigest: styleImage.digest,
  };
  await tx.objectStore('style-image').put(styleImage, KEY);
  await settingsStore.put(appSettings, KEY);
  await tx.done;
  return appSettings;
}

export async function discardStyleImage(expectedDigest: string): Promise<{
  appSettings: AppSettings;
  discarded: boolean;
}> {
  const db = await dbPromise;
  const tx = db.transaction(['app-settings', 'style-image'], 'readwrite');
  const settingsStore = tx.objectStore('app-settings');
  const currentSettings: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    ...(await settingsStore.get(KEY)),
  };
  if (currentSettings.styleTransferImageDigest !== expectedDigest) {
    await tx.done;
    return {appSettings: currentSettings, discarded: false};
  }
  const {styleTransferImageDigest: _styleTransferImageDigest, ...appSettings} = currentSettings;
  await tx.objectStore('style-image').delete(KEY);
  await settingsStore.put(appSettings, KEY);
  await tx.done;
  return {appSettings, discarded: true};
}
