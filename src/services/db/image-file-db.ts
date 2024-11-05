/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
