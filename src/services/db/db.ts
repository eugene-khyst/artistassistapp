/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DBSchema, IDBPDatabase, openDB} from 'idb';
import {PaintMix, PaintSetDefinition, PaintType} from '~/src/services/color';
import {ColorPickerSettings, ImageFile} from './types';

export interface ArtistAssistAppDB extends DBSchema {
  'paint-sets': {
    value: PaintSetDefinition;
    key: PaintType;
    indexes: {'by-timestamp': number};
  };
  'image-files': {
    value: ImageFile;
    key: number;
  };
  'color-picker': {
    value: ColorPickerSettings;
    key: number;
  };
  'paint-mixes': {
    value: PaintMix;
    key: string;
  };
}

export const dbPromise: Promise<IDBPDatabase<ArtistAssistAppDB>> = openDB<ArtistAssistAppDB>(
  'artist-assist-app-db',
  3,
  {
    upgrade(db: IDBPDatabase<ArtistAssistAppDB>) {
      if (!db.objectStoreNames.contains('paint-sets')) {
        const paintSetStore = db.createObjectStore('paint-sets', {
          keyPath: 'type',
        });
        paintSetStore.createIndex('by-timestamp', 'timestamp');
      }
      if (!db.objectStoreNames.contains('image-files')) {
        db.createObjectStore('image-files', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      if (!db.objectStoreNames.contains('color-picker')) {
        db.createObjectStore('color-picker');
      }
      if (!db.objectStoreNames.contains('paint-mixes')) {
        db.createObjectStore('paint-mixes', {
          keyPath: 'id',
        });
      }
    },
  }
);
