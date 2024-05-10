/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ColorSetDefinition, ColorType} from '~/src/services/color';

import {dbPromise} from './db';

export async function getLastColorSet(): Promise<ColorSetDefinition | undefined> {
  const db = await dbPromise;
  const colorSets: ColorSetDefinition[] = await db.getAllFromIndex('color-sets', 'by-timestamp');
  return colorSets.length ? colorSets[colorSets.length - 1] : undefined;
}

export async function getColorSetByType(type: ColorType): Promise<ColorSetDefinition | undefined> {
  const db = await dbPromise;
  return await db.get('color-sets', type);
}

export async function saveColorSet(colorSet: ColorSetDefinition): Promise<void> {
  const db = await dbPromise;
  await db.put('color-sets', {...colorSet, timestamp: Date.now()});
}
