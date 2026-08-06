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

import type {
  DeleteDBCallbacks,
  IDBPDatabase,
  IDBPObjectStore,
  IDBPTransaction,
  IndexKey,
  IndexNames,
  StoreNames,
  StoreValue,
} from 'idb';
import {deleteDB, openDB} from 'idb';

import {applyMigrations} from '@/services/db/migrations';
import {type ArtistAssistAppDB, OBJECT_STORE_NAMES, type StoreName} from '@/services/db/schema';
import {withWebLock} from '@/utils/web-lock';

const DB_NAME = 'artistassistapp';
const DB_VERSION = 10;
const DB_MIGRATIONS_LOCK_NAME = 'artistassistapp:db-migrations';

export type DBReadWriteTransaction = IDBPTransaction<ArtistAssistAppDB, StoreName[], 'readwrite'>;
export type DBReadTransaction = IDBPTransaction<
  ArtistAssistAppDB,
  StoreName[],
  'readonly' | 'readwrite'
>;

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
      createStoreIfNotExists(db, tx, 'store-changes');
      const migrationsStore = createStoreIfNotExists(db, tx, 'migrations', {
        keyPath: 'id',
        autoIncrement: true,
      });
      createIndexIfNotExists(migrationsStore, 'by-name', 'name', {unique: true});

      createStoreIfNotExists(db, tx, 'app-settings');

      const colorSetStore = createStoreIfNotExists(db, tx, 'color-sets', {
        keyPath: 'id',
        autoIncrement: true,
      });
      deleteIndexIfExists(colorSetStore, 'by-date');
      deleteIndexIfExists(colorSetStore, 'by-type');

      const imageFilesStore = createStoreIfNotExists(db, tx, 'images', {
        keyPath: 'id',
        autoIncrement: true,
      });
      createIndexIfNotExists(imageFilesStore, 'by-date', 'date');
      createIndexIfNotExists(imageFilesStore, 'by-digest', 'digest');
      createStoreIfNotExists(db, tx, 'image-metadata', {
        keyPath: 'digest',
      });
      createStoreIfNotExists(db, tx, 'style-image');

      const processedImagesStore = createStoreIfNotExists(db, tx, 'processed-images', {
        keyPath: 'key',
      });
      createIndexIfNotExists(processedImagesStore, 'by-date', 'date');
      createIndexIfNotExists(processedImagesStore, 'by-digest', 'digests', {multiEntry: true});

      const colorMixturesStore = createStoreIfNotExists(db, tx, 'color-mixtures', {
        keyPath: 'id',
        autoIncrement: true,
      });
      createIndexIfNotExists(colorMixturesStore, 'by-imageFileDigest', 'imageFileDigest');
      deleteIndexIfExists(colorMixturesStore, 'by-imageFileId');

      const customBrandsStore = createStoreIfNotExists(db, tx, 'custom-brands', {
        keyPath: 'id',
        autoIncrement: true,
      });
      createIndexIfNotExists(customBrandsStore, 'by-type', 'type');
      deleteIndexIfExists(customBrandsStore, 'by-date');

      createStoreIfNotExists(db, tx, 'auth-attempt');
      createStoreIfNotExists(db, tx, 'auth-session');
      createStoreIfNotExists(db, tx, 'cloud-connection-attempt');
      createStoreIfNotExists(db, tx, 'cloud-connection');
      createStoreIfNotExists(db, tx, 'cloud-sync', {keyPath: 'connectionId'});
      createStoreIfNotExists(db, tx, 'local-state-connection');

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

function createStoreIfNotExists<
  TxStores extends ArrayLike<StoreNames<ArtistAssistAppDB>>,
  StoreName extends TxStores[number],
>(
  db: IDBPDatabase<ArtistAssistAppDB>,
  tx: IDBPTransaction<ArtistAssistAppDB, TxStores, 'versionchange'>,
  storeName: StoreName,
  params?: IDBObjectStoreParameters
): IDBPObjectStore<ArtistAssistAppDB, TxStores, StoreName, 'versionchange'> {
  if (!db.objectStoreNames.contains(storeName)) {
    db.createObjectStore(storeName, params);
  }
  return tx.objectStore(storeName);
}

type StoreIndexKeyPath<
  StoreName extends StoreNames<ArtistAssistAppDB>,
  IndexName extends IndexNames<ArtistAssistAppDB, StoreName>,
> = {
  [Key in Extract<keyof StoreValue<ArtistAssistAppDB, StoreName>, string>]: NonNullable<
    StoreValue<ArtistAssistAppDB, StoreName>[Key]
  > extends
    | IndexKey<ArtistAssistAppDB, StoreName, IndexName>
    | IndexKey<ArtistAssistAppDB, StoreName, IndexName>[]
    ? Key
    : never;
}[Extract<keyof StoreValue<ArtistAssistAppDB, StoreName>, string>];

function createIndexIfNotExists<
  TxStores extends ArrayLike<StoreNames<ArtistAssistAppDB>>,
  StoreName extends StoreNames<ArtistAssistAppDB>,
  IndexName extends IndexNames<ArtistAssistAppDB, StoreName>,
>(
  store: IDBPObjectStore<ArtistAssistAppDB, TxStores, StoreName, 'versionchange'>,
  indexName: IndexName,
  fieldName: StoreIndexKeyPath<StoreName, IndexName>,
  params?: IDBIndexParameters
): void {
  if (!store.indexNames.contains(indexName)) {
    store.createIndex(indexName, fieldName, params);
  }
}

function deleteIndexIfExists<
  TxStores extends ArrayLike<StoreNames<ArtistAssistAppDB>>,
  StoreName extends StoreNames<ArtistAssistAppDB>,
>(
  store: IDBPObjectStore<ArtistAssistAppDB, TxStores, StoreName, 'versionchange'>,
  indexName: string
): void {
  // @ts-expect-error Legacy index removed from schema
  if (store.indexNames.contains(indexName)) {
    store.deleteIndex(indexName);
  }
}
