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

import {
  deleteDB,
  type DeleteDBCallbacks,
  type IDBPDatabase,
  type IDBPObjectStore,
  type IDBPTransaction,
  type IndexKey,
  type IndexNames,
  openDB,
  type StoreNames,
  type StoreValue,
} from 'idb';

import {applyMigrations} from '@/services/db/migrations';
import {
  type ArtistAssistAppDB,
  type LegacyArtistAssistAppDB,
  type StoreName,
} from '@/services/db/schema';
import {withWebLock} from '@/utils/web-lock';

const DB_NAME = 'artistassistapp';
const DB_VERSION = 11;
const DB_MIGRATIONS_LOCK_NAME = 'artistassistapp:db-migrations';

export type DBReadWriteTransaction = IDBPTransaction<ArtistAssistAppDB, StoreName[], 'readwrite'>;
export type DBReadTransaction = IDBPTransaction<
  ArtistAssistAppDB,
  StoreName[],
  'readonly' | 'readwrite'
>;

const internalDbPromise: Promise<IDBPDatabase<LegacyArtistAssistAppDB>> =
  openDB<LegacyArtistAssistAppDB>(DB_NAME, DB_VERSION, {
    upgrade(
      db: IDBPDatabase<LegacyArtistAssistAppDB>,
      _oldVersion: number,
      _newVersion: number | null,
      tx: IDBPTransaction<
        LegacyArtistAssistAppDB,
        StoreNames<LegacyArtistAssistAppDB>[],
        'versionchange'
      >
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

      createStoreIfNotExists(db, tx, 'image-blobs', {
        keyPath: 'digest',
      });

      const imageMetadataStore = createStoreIfNotExists(db, tx, 'image-metadata', {
        keyPath: 'digest',
      });
      createIndexIfNotExists(imageMetadataStore, 'by-date', 'date');

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
    },
  });

export const dbPromise: Promise<IDBPDatabase<ArtistAssistAppDB>> = (async () => {
  const db = await internalDbPromise;
  const migratedDb = await withWebLock(DB_MIGRATIONS_LOCK_NAME, () => applyMigrations(db));
  return migratedDb as unknown as IDBPDatabase<ArtistAssistAppDB>;
})();

export async function deleteDatabase(callbacks?: DeleteDBCallbacks): Promise<void> {
  await deleteDB(DB_NAME, callbacks);
}

function createStoreIfNotExists<
  TxStores extends ArrayLike<StoreNames<LegacyArtistAssistAppDB>>,
  StoreName extends TxStores[number],
>(
  db: IDBPDatabase<LegacyArtistAssistAppDB>,
  tx: IDBPTransaction<LegacyArtistAssistAppDB, TxStores, 'versionchange'>,
  storeName: StoreName,
  params?: IDBObjectStoreParameters
): IDBPObjectStore<LegacyArtistAssistAppDB, TxStores, StoreName, 'versionchange'> {
  if (!db.objectStoreNames.contains(storeName)) {
    db.createObjectStore(storeName, params);
  }
  return tx.objectStore(storeName);
}

type StoreIndexKeyPath<
  StoreName extends StoreNames<LegacyArtistAssistAppDB>,
  IndexName extends IndexNames<LegacyArtistAssistAppDB, StoreName>,
> = {
  [Key in Extract<keyof StoreValue<LegacyArtistAssistAppDB, StoreName>, string>]: NonNullable<
    StoreValue<LegacyArtistAssistAppDB, StoreName>[Key]
  > extends
    | IndexKey<LegacyArtistAssistAppDB, StoreName, IndexName>
    | IndexKey<LegacyArtistAssistAppDB, StoreName, IndexName>[]
    ? Key
    : never;
}[Extract<keyof StoreValue<LegacyArtistAssistAppDB, StoreName>, string>];

function createIndexIfNotExists<
  TxStores extends ArrayLike<StoreNames<LegacyArtistAssistAppDB>>,
  StoreName extends StoreNames<LegacyArtistAssistAppDB>,
  IndexName extends IndexNames<LegacyArtistAssistAppDB, StoreName>,
>(
  store: IDBPObjectStore<LegacyArtistAssistAppDB, TxStores, StoreName, 'versionchange'>,
  indexName: IndexName,
  fieldName: StoreIndexKeyPath<StoreName, IndexName>,
  params?: IDBIndexParameters
): void {
  if (!store.indexNames.contains(indexName)) {
    store.createIndex(indexName, fieldName, params);
  }
}

function deleteIndexIfExists<
  TxStores extends ArrayLike<StoreNames<LegacyArtistAssistAppDB>>,
  StoreName extends StoreNames<LegacyArtistAssistAppDB>,
>(
  store: IDBPObjectStore<LegacyArtistAssistAppDB, TxStores, StoreName, 'versionchange'>,
  indexName: string
): void {
  // @ts-expect-error Legacy index removed from schema
  if (store.indexNames.contains(indexName)) {
    store.deleteIndex(indexName);
  }
}
