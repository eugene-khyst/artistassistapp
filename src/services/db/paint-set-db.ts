/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PaintSetDefinition, PaintType} from '../color';
import {dbPromise} from './db';

export async function getLastPaintSet(): Promise<PaintSetDefinition | undefined> {
  const db = await dbPromise;
  const paintSets: PaintSetDefinition[] = await db.getAllFromIndex('paint-sets', 'by-timestamp');
  return paintSets.length ? paintSets[paintSets.length - 1] : undefined;
}

export async function getPaintSetByType(type: PaintType): Promise<PaintSetDefinition | undefined> {
  return (await dbPromise).get('paint-sets', type);
}

export async function savePaintSet(paintSet: PaintSetDefinition): Promise<void> {
  (await dbPromise).put('paint-sets', {...paintSet, timestamp: Date.now()});
}
