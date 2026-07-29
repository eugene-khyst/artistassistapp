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

import type {DBReadWriteTransaction} from '@/services/db/db';
import {markStoreChanged} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';
import type {ImageFile, ImageMetadata} from '@/services/image/image-file';
import {toImageMetadata} from '@/services/image/image-file';

import {dbPromise} from './db';

export async function getRecentImageFiles(offset: number, limit: number): Promise<ImageFile[]> {
  const db = await dbPromise;
  const index = db.transaction('images').store.index('by-date');
  let cursor = await index.openCursor(null, 'prev');
  if (cursor && offset > 0) {
    cursor = await cursor.advance(offset);
  }
  const imageFiles: ImageFile[] = [];
  while (cursor && imageFiles.length < limit) {
    imageFiles.push(cursor.value);
    cursor = await cursor.continue();
  }
  return imageFiles;
}

export async function getOldestImageFile(): Promise<ImageFile | undefined> {
  const db = await dbPromise;
  const index = db.transaction('images').store.index('by-date');
  return (await index.openCursor())?.value;
}

export async function countImageFiles(): Promise<number> {
  const db = await dbPromise;
  return await db.count('images');
}

export async function getAllImageMetadata(): Promise<ImageMetadata[]> {
  const db = await dbPromise;
  return await db.getAll('image-metadata');
}

export async function getImageFileByDigest(digest: string): Promise<ImageFile | undefined> {
  const db = await dbPromise;
  return await db.getFromIndex('images', 'by-digest', digest);
}

export async function hasImageFile(digest: string): Promise<boolean> {
  const db = await dbPromise;
  return (await db.countFromIndex('images', 'by-digest', digest)) > 0;
}

export async function saveNewImageFiles(
  imageFiles: ImageFile[],
  {
    preserveDate = false,
    tx: existingTx,
  }: {
    preserveDate?: boolean;
    tx?: DBReadWriteTransaction;
  } = {}
): Promise<StoreChangeTokens> {
  const tx =
    existingTx ??
    (await dbPromise).transaction(['images', 'image-metadata', 'store-changes'], 'readwrite');
  const imagesStore = tx.objectStore('images');
  const imageMetadataStore = tx.objectStore('image-metadata');
  for (const imageFile of imageFiles) {
    const existing = await imagesStore.index('by-digest').get(imageFile.digest);
    if (existing?.id !== undefined) {
      imageFile.id = existing.id;
    }
    // A restore rewrites the photo but keeps the local "last used" date.
    imageFile.date = preserveDate ? (existing?.date ?? imageFile.date) : new Date();
    imageFile.id = await imagesStore.put(imageFile);
    await imageMetadataStore.put(toImageMetadata(imageFile));
  }
  const tokens: StoreChangeTokens = {
    images: await markStoreChanged(tx, 'images'),
  };
  if (!existingTx) {
    await tx.done;
  }
  return tokens;
}

export async function updateImageFile(imageFile: ImageFile): Promise<StoreChangeTokens> {
  const {id} = imageFile;
  if (id === undefined) {
    throw new Error(`Image does not exist: ${imageFile.name ?? imageFile.digest}`);
  }
  const db = await dbPromise;
  const tx = db.transaction(['images', 'image-metadata', 'store-changes'], 'readwrite');
  const imagesStore = tx.objectStore('images');
  if ((await imagesStore.count(id)) === 0) {
    throw new Error(`Image does not exist: ${imageFile.name ?? imageFile.digest}`);
  }
  imageFile.date = new Date();
  await imagesStore.put(imageFile);
  await tx.objectStore('image-metadata').put(toImageMetadata(imageFile));
  const tokens: StoreChangeTokens = {
    images: await markStoreChanged(tx, 'images'),
  };
  await tx.done;
  return tokens;
}

export async function deleteImageFileAndColorMixturesByDigest(
  digest: string
): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(
    ['images', 'image-metadata', 'color-mixtures', 'store-changes'],
    'readwrite'
  );
  const imagesStore = tx.objectStore('images');
  const imageFileId = await imagesStore.index('by-digest').getKey(digest);
  if (imageFileId) {
    await imagesStore.delete(imageFileId);
  }
  await tx.objectStore('image-metadata').delete(digest);
  const colorMixturesStore = tx.objectStore('color-mixtures');
  const colorMixtureIds = await colorMixturesStore.index('by-imageFileDigest').getAllKeys(digest);
  for (const id of colorMixtureIds) {
    await colorMixturesStore.delete(id);
  }
  const imagesToken = await markStoreChanged(tx, 'images');
  const colorMixturesToken = await markStoreChanged(tx, 'color-mixtures');
  await tx.done;
  return {
    images: imagesToken,
    'color-mixtures': colorMixturesToken,
  };
}
