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

import {deleteDatabase} from '~/src/services/db/db';

export async function requestPersistentStorage(): Promise<boolean> {
  if (
    !('storage' in navigator && 'persisted' in navigator.storage && 'persist' in navigator.storage)
  ) {
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
      console.warn('Persistent storage permission denied');
    }
    return granted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

function reloadDelayed(reload = true, delay = 500) {
  if (reload) {
    setTimeout(() => {
      window.location.reload();
    }, delay);
  }
}

async function unregisterServiceWorkers() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    } catch (error) {
      console.error('Failed to unregister service workers:', error);
    }
  }
}

export async function clearCache(reload = true) {
  await unregisterServiceWorkers();
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
  reloadDelayed(reload);
}

export async function deleteAppData() {
  await clearCache(false);
  localStorage.clear();
  try {
    await Promise.race([
      deleteDatabase({
        blocked: () => {
          console.warn('Database deletion blocked by other connections');
        },
      }),
      new Promise((_, reject) =>
        setTimeout(() => {
          reject(new Error('Database deletion timeout'));
        }, 3000)
      ),
    ]);
  } catch (error) {
    console.error('Error while deleting app data:', error);
  } finally {
    reloadDelayed();
  }
}
