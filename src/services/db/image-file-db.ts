/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {dbPromise} from './db';

export async function getImageFile(): Promise<File | undefined> {
  return (await dbPromise).get('image-file', 0);
}

export async function saveImageFile(file: File): Promise<void> {
  (await dbPromise).put('image-file', file, 0);
}
