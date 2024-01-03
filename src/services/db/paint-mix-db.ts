/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PaintMix} from '../color';
import {dbPromise} from './db';

export async function getPaintMixes(imageFileId?: number): Promise<PaintMix[]> {
  const db = await dbPromise;
  return (await db.getAll('paint-mixes')).filter(
    (paintMix: PaintMix) =>
      !paintMix.imageFileId || (imageFileId && paintMix.imageFileId === imageFileId)
  );
}

export async function isPaintMixExist(paintMixId: string): Promise<boolean> {
  const db = await dbPromise;
  const count: number = await db.count('paint-mixes', paintMixId);
  return count > 0;
}

export async function savePaintMix(paintMix: PaintMix): Promise<void> {
  const db = await dbPromise;
  await db.put('paint-mixes', paintMix);
}

export async function deletePaintMix(paintMixId: string): Promise<void> {
  const db = await dbPromise;
  await db.delete('paint-mixes', paintMixId);
}
