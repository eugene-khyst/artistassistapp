/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {IDBPTransaction} from 'idb';
import {ImageFile} from '.';
import {PaintMix} from '../color';
import {ArtistAssistAppDB, dbPromise} from './db';

function compareImageFilesByDate(a: ImageFile, b: ImageFile) {
  return b.date.getTime() - a.date.getTime();
}

export async function getImageFiles(): Promise<ImageFile[]> {
  const db = await dbPromise;
  const imageFiles: ImageFile[] = await db.getAll('image-files');
  return imageFiles.sort(compareImageFilesByDate);
}

export async function saveImageFile(file: File, maxImageFiles: number): Promise<number> {
  const db = await dbPromise;
  const tx = db.transaction(['image-files', 'paint-mixes'], 'readwrite');
  const imageFiles: ImageFile[] = await tx.objectStore('image-files').getAll();
  imageFiles.sort(compareImageFilesByDate);
  if (imageFiles.length >= maxImageFiles) {
    await Promise.all(
      imageFiles
        .slice(maxImageFiles - 1)
        .map(
          (imageFile: ImageFile): Promise<void> => deleteImageFileAndPaintMixes(tx, imageFile.id!)
        )
    );
  }
  const imageFileId: number = await tx.objectStore('image-files').put({
    file,
    date: new Date(),
  });
  await tx.done;
  return imageFileId;
}

export async function deleteImageFile(imageFileId: number): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['image-files', 'paint-mixes'], 'readwrite');
  await deleteImageFileAndPaintMixes(tx, imageFileId);
  await tx.done;
}

async function deleteImageFileAndPaintMixes(
  tx: IDBPTransaction<ArtistAssistAppDB, ('image-files' | 'paint-mixes')[], 'readwrite'>,
  imageFileId: number
): Promise<void> {
  await tx.objectStore('image-files').delete(imageFileId);
  await Promise.all(
    (await tx.objectStore('paint-mixes').getAll())
      .filter((paintMix: PaintMix) => paintMix.imageFileId === imageFileId)
      .map((paintMix: PaintMix): Promise<void> => tx.objectStore('paint-mixes').delete(paintMix.id))
  );
}
