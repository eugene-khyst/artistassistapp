/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ColorSetDefinition, ColorType} from '~/src/services/color';

import {dbPromise} from './db';

export async function getLastColorSet(): Promise<ColorSetDefinition | undefined> {
  const db = await dbPromise;
  const index = db.transaction('color-sets').store.index('by-date');
  const cursor = await index.openCursor(null, 'prev');
  return cursor ? cursor.value : undefined;
}

export async function getColorSetsByType(type: ColorType): Promise<ColorSetDefinition[]> {
  const db = await dbPromise;
  return await db.transaction('color-sets').store.index('by-type').getAll(type);
}

export async function saveColorSet({
  id,
  ...colorSet
}: ColorSetDefinition): Promise<ColorSetDefinition> {
  const db = await dbPromise;
  id = await db.put('color-sets', {
    ...colorSet,
    ...(id ? {id} : {}),
    date: new Date(),
  });
  return {
    ...colorSet,
    id,
  };
}

export async function deleteColorSet(id: number): Promise<void> {
  const db = await dbPromise;
  await db.delete('color-sets', id);
}
