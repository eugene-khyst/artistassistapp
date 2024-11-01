/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {DBSchema, IDBPDatabase} from 'idb';
import {deleteDB, openDB} from 'idb';

import type {ColorMixture, ColorSetDefinition, ColorType} from '~/src/services/color';
import type {ImageFile} from '~/src/services/image';
import type {AppSettings} from '~/src/services/settings';

const DB_NAME = 'artistassistapp';
const DB_VERSION = 2;

export interface ArtistAssistAppDB extends DBSchema {
  'app-settings': {
    value: AppSettings;
    key: number;
  };
  'color-sets': {
    value: ColorSetDefinition;
    key: number;
    indexes: {
      'by-date': Date;
      'by-type': ColorType;
    };
  };
  images: {
    value: ImageFile;
    key: number;
    indexes: {'by-date': Date};
  };
  'color-mixtures': {
    value: ColorMixture;
    key: number;
    indexes: {'by-imageFileId': number};
  };
}

type KeysEnum<T> = {[P in keyof Required<T>]: 1};
const artistAssistAppDBKeys: KeysEnum<ArtistAssistAppDB> = {
  'app-settings': 1,
  'color-sets': 1,
  images: 1,
  'color-mixtures': 1,
};
const objectStoreNames: string[] = Object.keys(artistAssistAppDBKeys);

export const dbPromise: Promise<IDBPDatabase<ArtistAssistAppDB>> = openDB<ArtistAssistAppDB>(
  DB_NAME,
  DB_VERSION,
  {
    upgrade(db: IDBPDatabase<ArtistAssistAppDB>) {
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

      if (!db.objectStoreNames.contains('color-mixtures')) {
        const colorMixturesStore = db.createObjectStore('color-mixtures', {
          keyPath: 'id',
          autoIncrement: true,
        });
        colorMixturesStore.createIndex('by-imageFileId', 'imageFileId');
      }

      for (const objectStoreName of db.objectStoreNames) {
        if (!objectStoreNames.includes(objectStoreName)) {
          db.deleteObjectStore(objectStoreName);
        }
      }
    },
  }
);

export async function deleteDatabase(): Promise<void> {
  await deleteDB(DB_NAME);
}

export async function clearDatabase(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }
  const databases: IDBDatabaseInfo[] = await indexedDB.databases();
  for (const {name} of databases) {
    if (name && name !== DB_NAME) {
      await deleteDB(name);
    }
  }
}
