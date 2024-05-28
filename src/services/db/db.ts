/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {DBSchema, IDBPDatabase, IDBPTransaction} from 'idb';
import {openDB} from 'idb';

import type {ColorMixture, ColorSetDefinition, ColorType} from '~/src/services/color';
import type {LegacyPaintMix, LegacyPaintSetDefinition} from '~/src/services/db/db-migrations';
import {toColorMixture, toColorSet} from '~/src/services/db/db-migrations';

import type {AppSettings, ColorPickerSettings, ImageFile} from './types';

export interface ArtistAssistAppDB extends DBSchema {
  app: {
    value: AppSettings;
    key: number;
  };
  'color-sets': {
    value: ColorSetDefinition;
    key: ColorType;
    indexes: {'by-timestamp': number};
  };
  'image-files': {
    value: ImageFile;
    key: number;
    indexes: {'by-date': Date};
  };
  'color-picker': {
    value: ColorPickerSettings;
    key: number;
  };
  'color-mixtures': {
    value: ColorMixture;
    key: number;
  };
  'paint-sets': {
    value: LegacyPaintSetDefinition;
    key: ColorType;
  };
  'paint-mixes': {
    value: LegacyPaintMix;
    key: string;
  };
}

export const dbPromise: Promise<IDBPDatabase<ArtistAssistAppDB>> = openDB<ArtistAssistAppDB>(
  'artist-assist-app-db',
  5,
  {
    async upgrade(
      db: IDBPDatabase<ArtistAssistAppDB>,
      oldVersion: number,
      newVersion: number,
      tx: IDBPTransaction<
        ArtistAssistAppDB,
        (
          | 'app'
          | 'color-sets'
          | 'image-files'
          | 'color-picker'
          | 'color-mixtures'
          | 'paint-sets'
          | 'paint-mixes'
        )[],
        'versionchange'
      >
    ) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Migrating DB from version ${oldVersion} to ${newVersion}`);
      }

      if (!db.objectStoreNames.contains('app')) {
        db.createObjectStore('app');
      }

      if (!db.objectStoreNames.contains('color-sets')) {
        const colorSetStore = db.createObjectStore('color-sets', {
          keyPath: 'type',
        });
        colorSetStore.createIndex('by-timestamp', 'timestamp');
      }

      if (db.objectStoreNames.contains('paint-sets')) {
        for (const paintSet of await tx.objectStore('paint-sets').getAll()) {
          await tx.objectStore('color-sets').put(toColorSet(paintSet));
        }
        db.deleteObjectStore('paint-sets');
      }

      if (!db.objectStoreNames.contains('image-files')) {
        db.createObjectStore('image-files', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      if (db.objectStoreNames.contains('image-files')) {
        const imageFilesStore = tx.objectStore('image-files');
        if (!imageFilesStore.indexNames.contains('by-date')) {
          imageFilesStore.createIndex('by-date', 'date');
        }
      }

      if (!db.objectStoreNames.contains('color-picker')) {
        db.createObjectStore('color-picker');
      }

      if (!db.objectStoreNames.contains('color-mixtures')) {
        db.createObjectStore('color-mixtures', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }

      if (db.objectStoreNames.contains('paint-mixes')) {
        for (const paintMix of await tx.objectStore('paint-mixes').getAll()) {
          await tx.objectStore('color-mixtures').put(toColorMixture(paintMix));
        }
        db.deleteObjectStore('paint-mixes');
      }
    },
  }
);

export async function version(): Promise<number> {
  const db = await dbPromise;
  return db.version;
}
