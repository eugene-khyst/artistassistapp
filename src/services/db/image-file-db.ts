/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {IDBPTransaction} from 'idb';

import type {ArtistAssistAppDB} from './db';
import {dbPromise} from './db';
import type {ImageFile} from './types';

export async function getLastImageFile(): Promise<ImageFile | undefined> {
  const db = await dbPromise;
  const index = db.transaction('image-files').store.index('by-date');
  const cursor = await index.openCursor(null, 'prev');
  return cursor ? cursor.value : undefined;
}

export async function getImageFiles(): Promise<ImageFile[]> {
  const db = await dbPromise;
  const imageFiles: ImageFile[] = await db.getAllFromIndex('image-files', 'by-date');
  return imageFiles.reverse();
}

export async function saveImageFile(imageFile: ImageFile, maxImageFiles = 12): Promise<ImageFile> {
  const db = await dbPromise;
  if (!imageFile.id) {
    const tx = db.transaction(['image-files', 'color-mixtures'], 'readwrite');
    const imageFileIds: number[] = await tx
      .objectStore('image-files')
      .index('by-date')
      .getAllKeys();
    imageFileIds.reverse();
    if (imageFileIds.length >= maxImageFiles) {
      for (const id of imageFileIds.slice(maxImageFiles - 1)) {
        void deleteImageFileAndColorMixtures(tx, id);
      }
    }
    const id: number = await tx.objectStore('image-files').put(imageFile);
    await tx.done;
    return {
      ...imageFile,
      id,
    };
  } else {
    await db.put('image-files', imageFile);
    return imageFile;
  }
}

export async function deleteImageFile(id: number): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['image-files', 'color-mixtures'], 'readwrite');
  await deleteImageFileAndColorMixtures(tx, id);
  await tx.done;
}

async function deleteImageFileAndColorMixtures(
  tx: IDBPTransaction<ArtistAssistAppDB, ('image-files' | 'color-mixtures')[], 'readwrite'>,
  idToDelete: number
): Promise<void> {
  await tx.objectStore('image-files').delete(idToDelete);
  const colorMixtureIds = await tx
    .objectStore('color-mixtures')
    .index('by-imageFileId')
    .getAllKeys(idToDelete);
  for (const id of colorMixtureIds) {
    void tx.objectStore('color-mixtures').delete(id);
  }
}
