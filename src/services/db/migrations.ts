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

import type {IDBPDatabase, IDBPTransaction} from 'idb';

import type {RgbTuple} from '~/src/services/color/space/rgb';
import type {ColorMixture} from '~/src/services/color/types';
import {EMPTY_DIGEST} from '~/src/services/db/color-mixture-db';
import {type ArtistAssistAppDB, OBJECT_STORE_NAMES, type StoreName} from '~/src/services/db/schema';
import type {ImageFile} from '~/src/services/image/image-file';
import {digestArrayBuffer} from '~/src/utils/digest';

export interface AppliedMigration {
  id?: number;
  name: string;
  appliedAt: Date;
}

export interface Migration<T = unknown> {
  name: string;
  prepare?: (db: IDBPDatabase<ArtistAssistAppDB>) => Promise<T>;
  migrate: (
    tx: IDBPTransaction<ArtistAssistAppDB, StoreName[], 'readwrite'>,
    data: T
  ) => Promise<void>;
}

function defineMigration<T = unknown>({name, prepare, migrate}: Migration<T>): Migration {
  return {
    name,
    prepare,
    migrate: (tx, data) => migrate(tx, data as T),
  };
}

const MIGRATIONS: Migration[] = [
  defineMigration<Map<number, string>>({
    name: '001-image-file-digest',
    prepare: async db => {
      const imageFiles = (await db.getAll('images')) as (Omit<ImageFile, 'digest'> & {
        digest?: string;
      })[];
      return new Map<number, string>(
        await Promise.all(
          imageFiles.map(
            async ({id, buffer, digest}): Promise<[number, string]> => [
              id!,
              digest ?? (await digestArrayBuffer(buffer)),
            ]
          )
        )
      );
    },
    migrate: async (tx, digests): Promise<void> => {
      for await (const cursor of tx.objectStore('images')) {
        const data = cursor.value;
        if (!data.digest) {
          await cursor.update({
            ...data,
            digest: digests.get(data.id!)!,
          });
        }
      }
      for await (const cursor of tx.objectStore('color-mixtures')) {
        const {imageFileId, ...data} = cursor.value as ColorMixture & {
          imageFileId?: number | null;
        };
        const imageFileDigest: string = (imageFileId && digests.get(imageFileId)) || EMPTY_DIGEST;
        await cursor.update({...data, imageFileDigest});
      }
    },
  }),
  defineMigration({
    name: '002-color-mixture-underlayer-rgb',
    migrate: async (tx): Promise<void> => {
      for await (const cursor of tx.objectStore('color-mixtures')) {
        const {backgroundRgb, ...data} = cursor.value as ColorMixture & {
          backgroundRgb?: RgbTuple;
        };
        await cursor.update({
          ...data,
          underlayerRgb: backgroundRgb,
        });
      }
    },
  }),
];

export async function applyMigrations(
  db: IDBPDatabase<ArtistAssistAppDB>
): Promise<IDBPDatabase<ArtistAssistAppDB>> {
  const appliedMigrations: AppliedMigration[] = await db.getAll('migrations');
  const appliedMigrationsMap = new Map(appliedMigrations.map(h => [h.name, h]));
  const pendingMigrations = MIGRATIONS.filter(({name}) => !appliedMigrationsMap.has(name));
  for (const {name, prepare, migrate} of pendingMigrations) {
    console.log(`Applying DB migration: ${name}`);
    const data = prepare && (await prepare(db));
    const tx = db.transaction(OBJECT_STORE_NAMES, 'readwrite');
    await migrate(tx, data);
    await tx.objectStore('migrations').add({
      name,
      appliedAt: new Date(),
    });
    await tx.done;
  }
  return db;
}
