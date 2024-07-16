/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {DBSchema, IDBPDatabase} from 'idb';
import {deleteDB, openDB} from 'idb';

import type {ColorMixture, ColorSetDefinition, ColorType} from '~/src/services/color';

import type {AppSettings, ImageFile} from './types';

const DB_NAME = 'artistassistapp';
const DB_VERSION = 1;

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
  'image-files': {
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

// Delete legacy DB
void deleteDB('artist-assist-app-db');

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

      if (!db.objectStoreNames.contains('image-files')) {
        const imageFilesStore = db.createObjectStore('image-files', {
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
    },
  }
);

export async function deleteDb(): Promise<void> {
  await deleteDB(DB_NAME);
}
