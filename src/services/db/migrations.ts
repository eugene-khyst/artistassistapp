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

import type {RgbTuple} from '@/services/color/space/rgb';
import type {ColorMixture} from '@/services/color/types';
import {EMPTY_DIGEST} from '@/services/db/color-mixture-db';
import {type ArtistAssistAppDB, OBJECT_STORE_NAMES, type StoreName} from '@/services/db/schema';
import type {ImageFile} from '@/services/image/image-file';
import {toImageMetadata} from '@/services/image/image-file';
import type {AppSettings} from '@/services/settings/types';
import {digestArrayBuffer} from '@/utils/digest';

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
      const imageFiles = (await db.getAll('images')) as unknown as (Omit<
        ImageFile,
        'blob' | 'digest'
      > & {
        buffer: ArrayBuffer;
        digest?: string;
      })[];
      return new Map<number, string>(
        await Promise.all(
          imageFiles.map(async ({id, buffer, digest}): Promise<[number, string]> => [
            id!,
            digest ?? (await digestArrayBuffer(buffer)),
          ])
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
  // Migration '003-auth-session' has been removed as it is no longer needed
  defineMigration({
    name: '004-image-metadata',
    migrate: async (tx): Promise<void> => {
      const imageMetadataStore = tx.objectStore('image-metadata');
      for await (const cursor of tx.objectStore('images')) {
        const {buffer, ...data} = cursor.value as unknown as Omit<ImageFile, 'blob'> & {
          buffer: ArrayBuffer;
        };
        if (await imageMetadataStore.getKey(data.digest)) {
          await cursor.delete();
          continue;
        }
        const imageFile: ImageFile = {
          ...data,
          blob: new Blob([buffer], {type: data.type}),
        };
        await cursor.update(imageFile);
        await imageMetadataStore.put(toImageMetadata(imageFile));
      }
    },
  }),
  defineMigration({
    name: '005-style-image',
    migrate: async (tx): Promise<void> => {
      const settingsStore = tx.objectStore('app-settings');
      const settings = await settingsStore.get(0);
      if (!settings) {
        return;
      }
      const {
        styleTransferImage,
        ...rest
      }: AppSettings & {
        styleTransferImage?: Omit<ImageFile, 'blob'> & {buffer: ArrayBuffer};
      } = settings;
      if (!styleTransferImage) {
        return;
      }
      const {buffer, ...data} = styleTransferImage;
      const styleImage: ImageFile = {
        ...data,
        blob: new Blob([buffer], {type: data.type}),
      };
      await tx.objectStore('style-image').put(styleImage, 0);
      await settingsStore.put({...rest, styleTransferImageDigest: styleImage.digest}, 0);
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
