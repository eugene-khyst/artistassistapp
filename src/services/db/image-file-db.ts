/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {IDBPTransaction} from 'idb';

import type {ImageFile} from '~/src/services/image';

import type {ArtistAssistAppDB} from './db';
import {dbPromise} from './db';

export async function getLastImageFile(): Promise<ImageFile | undefined> {
  const db = await dbPromise;
  const index = db.transaction('images').store.index('by-date');
  const cursor = await index.openCursor(null, 'prev');
  return cursor ? cursor.value : undefined;
}

export async function getImageFiles(): Promise<ImageFile[]> {
  const db = await dbPromise;
  const imageFiles: ImageFile[] = await db.getAllFromIndex('images', 'by-date');
  return imageFiles.reverse();
}

export async function saveImageFile(imageFile: ImageFile, maxImageFiles = 12): Promise<void> {
  const db = await dbPromise;
  imageFile.date = new Date();
  if (!imageFile.id) {
    const tx = db.transaction(['images', 'color-mixtures'], 'readwrite');
    const imageFileIds: number[] = await tx.objectStore('images').index('by-date').getAllKeys();
    imageFileIds.reverse();
    if (imageFileIds.length >= maxImageFiles) {
      for (const id of imageFileIds.slice(maxImageFiles - 1)) {
        void deleteImageFileAndColorMixtures(tx, id);
      }
    }
    const id: number = await tx.objectStore('images').put(imageFile);
    imageFile.id = id;
    await tx.done;
  } else {
    await db.put('images', imageFile);
  }
}

export async function deleteImageFile(id: number): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['images', 'color-mixtures'], 'readwrite');
  await deleteImageFileAndColorMixtures(tx, id);
  await tx.done;
}

async function deleteImageFileAndColorMixtures(
  tx: IDBPTransaction<ArtistAssistAppDB, ('images' | 'color-mixtures')[], 'readwrite'>,
  idToDelete: number
): Promise<void> {
  await tx.objectStore('images').delete(idToDelete);
  const colorMixtureIds = await tx
    .objectStore('color-mixtures')
    .index('by-imageFileId')
    .getAllKeys(idToDelete);
  for (const id of colorMixtureIds) {
    void tx.objectStore('color-mixtures').delete(id);
  }
}
