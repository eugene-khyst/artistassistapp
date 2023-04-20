/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PaintMix} from '../color';
import {dbPromise} from './db';

export async function getPaintMixes(): Promise<PaintMix[]> {
  return (await dbPromise).getAll('paint-mixes');
}

export async function isPaintMixExist(paintMixId: string): Promise<boolean> {
  const db = await dbPromise;
  return (await db.count('paint-mixes', paintMixId)) > 0;
}

export async function savePaintMix(paintMix: PaintMix): Promise<void> {
  (await dbPromise).put('paint-mixes', paintMix);
}

export async function deletePaintMix(paintMixId: string): Promise<void> {
  (await dbPromise).delete('paint-mixes', paintMixId);
}
