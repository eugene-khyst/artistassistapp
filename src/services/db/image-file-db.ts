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

import type {ImageFile} from '@/services/image/image-file';

import {dbPromise} from './db';

export async function getLastImageFile(): Promise<ImageFile | undefined> {
  const db = await dbPromise;
  const index = db.transaction('images').store.index('by-date');
  const cursor = await index.openCursor(null, 'prev');
  return cursor?.value;
}

export async function getImageFiles(): Promise<ImageFile[]> {
  const db = await dbPromise;
  const imageFiles: ImageFile[] = await db.getAllFromIndex('images', 'by-date');
  return imageFiles.reverse();
}

export async function saveImageFile(imageFile: ImageFile): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction('images', 'readwrite');
  imageFile.date = new Date();
  const existing: ImageFile | undefined = await tx.store.index('by-digest').get(imageFile.digest);
  if (existing?.id) {
    imageFile.id = existing.id;
  }
  imageFile.id = await tx.store.put(imageFile);
  await tx.done;
}

export async function deleteImageFile(digest: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['images', 'color-mixtures'], 'readwrite');
  const imagesStore = tx.objectStore('images');
  const imageFileId = await imagesStore.index('by-digest').getKey(digest);
  if (imageFileId) {
    await imagesStore.delete(imageFileId);
  }
  const colorMixtureIds = await tx
    .objectStore('color-mixtures')
    .index('by-imageFileDigest')
    .getAllKeys(digest);
  const colorMixturesStore = tx.objectStore('color-mixtures');
  for (const id of colorMixtureIds) {
    await colorMixturesStore.delete(id);
  }
  await tx.done;
}
