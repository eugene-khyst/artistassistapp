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

import type {DeleteDBCallbacks, IDBPDatabase, IDBPTransaction, StoreNames} from 'idb';
import {deleteDB, openDB} from 'idb';

import {applyMigrations} from '~/src/services/db/migrations';
import {type ArtistAssistAppDB, OBJECT_STORE_NAMES} from '~/src/services/db/schema';
import {withWebLock} from '~/src/utils/web-lock';

const DB_NAME = 'artistassistapp';
const DB_VERSION = 8;
const DB_MIGRATIONS_LOCK_NAME = 'artistassistapp:db-migrations';

const internalDbPromise: Promise<IDBPDatabase<ArtistAssistAppDB>> = openDB<ArtistAssistAppDB>(
  DB_NAME,
  DB_VERSION,
  {
    upgrade(
      db: IDBPDatabase<ArtistAssistAppDB>,
      _oldVersion: number,
      _newVersion: number | null,
      tx: IDBPTransaction<ArtistAssistAppDB, StoreNames<ArtistAssistAppDB>[], 'versionchange'>
    ) {
      if (!db.objectStoreNames.contains('migrations')) {
        const migrationsStore = db.createObjectStore('migrations', {
          keyPath: 'id',
          autoIncrement: true,
        });
        migrationsStore.createIndex('by-name', 'name', {unique: true});
      }

      if (!db.objectStoreNames.contains('app-settings')) {
        db.createObjectStore('app-settings');
      }

      if (!db.objectStoreNames.contains('color-sets')) {
        const colorSetStore = db.createObjectStore('color-sets', {
          keyPath: 'id',
          autoIncrement: true,
        });
        colorSetStore.createIndex('by-type', 'type');
        colorSetStore.createIndex('by-date', 'date');
      }

      if (!db.objectStoreNames.contains('images')) {
        const imageFilesStore = db.createObjectStore('images', {
          keyPath: 'id',
          autoIncrement: true,
        });
        imageFilesStore.createIndex('by-date', 'date');
      }
      const imageFilesStore = tx.objectStore('images');
      if (!imageFilesStore.indexNames.contains('by-digest')) {
        imageFilesStore.createIndex('by-digest', 'digest');
      }

      if (!db.objectStoreNames.contains('color-mixtures')) {
        db.createObjectStore('color-mixtures', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      const colorMixturesStore = tx.objectStore('color-mixtures');
      if (!colorMixturesStore.indexNames.contains('by-imageFileDigest')) {
        colorMixturesStore.createIndex('by-imageFileDigest', 'imageFileDigest');
      }
      // @ts-expect-error Legacy index removed from schema.
      if (colorMixturesStore.indexNames.contains('by-imageFileId')) {
        colorMixturesStore.deleteIndex('by-imageFileId');
      }

      if (!db.objectStoreNames.contains('custom-brands')) {
        const customBrandsStore = db.createObjectStore('custom-brands', {
          keyPath: 'id',
          autoIncrement: true,
        });
        customBrandsStore.createIndex('by-type', 'type');
        customBrandsStore.createIndex('by-date', 'date');
      }

      if (!db.objectStoreNames.contains('auth-attempt')) {
        db.createObjectStore('auth-attempt');
      }

      if (!db.objectStoreNames.contains('auth-session')) {
        db.createObjectStore('auth-session');
      }

      if (!db.objectStoreNames.contains('auth-error')) {
        db.createObjectStore('auth-error');
      }

      if (!db.objectStoreNames.contains('id-token')) {
        db.createObjectStore('id-token');
      }

      for (const objectStoreName of db.objectStoreNames) {
        if (!OBJECT_STORE_NAMES.includes(objectStoreName)) {
          db.deleteObjectStore(objectStoreName);
        }
      }
    },
  }
);

export const dbPromise: Promise<IDBPDatabase<ArtistAssistAppDB>> = internalDbPromise.then(
  (db): Promise<IDBPDatabase<ArtistAssistAppDB>> =>
    withWebLock(DB_MIGRATIONS_LOCK_NAME, () => applyMigrations(db))
);

export async function deleteDatabase(callbacks?: DeleteDBCallbacks): Promise<void> {
  await deleteDB(DB_NAME, callbacks);
}
