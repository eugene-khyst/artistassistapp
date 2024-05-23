/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {IDBPTransaction} from 'idb';

import type {ArtistAssistAppDB} from './db';
import {dbPromise} from './db';
import type {ImageFile} from './types';

const compareImageFilesByDate = (a: ImageFile, b: ImageFile) =>
  (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0);

export async function getImageFiles(): Promise<ImageFile[]> {
  const db = await dbPromise;
  const imageFiles: ImageFile[] = await db.getAll('image-files');
  return imageFiles.sort(compareImageFilesByDate);
}

export async function saveImageFile(imageFile: ImageFile, maxImageFiles = 12): Promise<ImageFile> {
  const db = await dbPromise;
  if (!imageFile.id) {
    const tx = db.transaction(['image-files', 'color-mixtures'], 'readwrite');
    const imageFiles: ImageFile[] = await tx.objectStore('image-files').getAll();
    imageFiles.sort(compareImageFilesByDate);
    if (imageFiles.length >= maxImageFiles) {
      for (const {id} of imageFiles.slice(maxImageFiles - 1)) {
        void deleteImageFileAndColorMixtures(tx, id!);
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
  const colorMixtures = await tx.objectStore('color-mixtures').getAll();
  for (const {id, imageFileId} of colorMixtures) {
    if (imageFileId === idToDelete) {
      void tx.objectStore('color-mixtures').delete(id!);
    }
  }
}
