/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ImageFile} from '.';
import {dbPromise} from './db';

const MAX_IMAGE_FILES = 3;

function compareImageFilesByDate(a: ImageFile, b: ImageFile) {
  return b.date.getTime() - a.date.getTime();
}

export async function getImageFiles(): Promise<ImageFile[]> {
  const db = await dbPromise;
  const imageFiles: ImageFile[] = await db.getAll('image-files');
  return imageFiles.sort(compareImageFilesByDate);
}

export async function saveImageFile(file: File): Promise<number> {
  const db = await dbPromise;
  const imageFiles: ImageFile[] = await db.getAll('image-files');
  imageFiles.sort(compareImageFilesByDate);
  if (imageFiles.length >= MAX_IMAGE_FILES) {
    await Promise.all(
      imageFiles
        .slice(MAX_IMAGE_FILES - 1)
        .map((imageFile: ImageFile): Promise<void> => db.delete('image-files', imageFile.id!))
    );
  }
  return await db.put('image-files', {
    file,
    date: new Date(),
  });
}

export async function deleteImageFile(imageFileId: number): Promise<void> {
  const db = await dbPromise;
  await db.delete('image-files', imageFileId);
}
