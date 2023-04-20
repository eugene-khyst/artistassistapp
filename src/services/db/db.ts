/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DBSchema, IDBPDatabase, openDB} from 'idb';
import {ColorPickerSettings, PaintMix, PaintSetDefinition, PaintType} from '../color';

interface ArtistAssistAppDB extends DBSchema {
  'paint-sets': {
    value: PaintSetDefinition;
    key: PaintType;
    indexes: {'by-timestamp': number};
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
  1,
  {
    upgrade(db: IDBPDatabase<ArtistAssistAppDB>, oldVersion: number) {
      switch (oldVersion) {
        case 0: {
          const paintSetStore = db.createObjectStore('paint-sets', {
            keyPath: 'type',
          });
          paintSetStore.createIndex('by-timestamp', 'timestamp');
          db.createObjectStore('color-picker');
          db.createObjectStore('paint-mixes', {
            keyPath: 'id',
          });
        }
      }
    },
  }
);
