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

import type {DBSchema, IDBPDatabase} from 'idb';
import {deleteDB, openDB} from 'idb';

import type {
  ColorMixture,
  ColorSetDefinition,
  ColorType,
  CustomColorBrandDefinition,
} from '~/src/services/color/types';
import type {ImageFile} from '~/src/services/image/image-file';
import type {AppSettings} from '~/src/services/settings/types';

const DB_NAME = 'artistassistapp';
const DB_VERSION = 3;

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
  'custom-brands': {
    value: CustomColorBrandDefinition;
    key: number;
    indexes: {
      'by-date': Date;
      'by-type': ColorType;
    };
  };
}

type KeysEnum<T> = {[P in keyof Required<T>]: 1};
const artistAssistAppDBKeys: KeysEnum<ArtistAssistAppDB> = {
  'app-settings': 1,
  'color-sets': 1,
  images: 1,
  'color-mixtures': 1,
  'custom-brands': 1,
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

      if (!db.objectStoreNames.contains('custom-brands')) {
        const customBrandsStore = db.createObjectStore('custom-brands', {
          keyPath: 'id',
          autoIncrement: true,
        });
        customBrandsStore.createIndex('by-type', 'type');
        customBrandsStore.createIndex('by-date', 'date');
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
