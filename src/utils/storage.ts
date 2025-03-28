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

export const PERSISTENT_STORAGE_WARN = {
  title: 'Permanent storage permission was denied',
  content:
    'Your data may not be saved reliably if the browser is closed. To fix it, install the app or add it to your browser bookmarks.',
};

export async function requestPersistentStorage(): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!navigator.storage?.persist) {
    console.warn('Persistent storage is not supported in this browser');
    return false;
  }
  try {
    if (await navigator.storage.persisted()) {
      console.log('Persistent storage is already enabled');
      return true;
    }
    const granted: boolean = await navigator.storage.persist();
    if (!granted) {
      console.log('Persistent storage permission denied');
    }
    return granted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}
