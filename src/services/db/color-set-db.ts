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

import type {ColorSetDefinition, ColorType} from '~/src/services/color';

import {dbPromise} from './db';

export async function getLastColorSet(): Promise<ColorSetDefinition | undefined> {
  const db = await dbPromise;
  const index = db.transaction('color-sets').store.index('by-date');
  const cursor = await index.openCursor(null, 'prev');
  return cursor?.value;
}

export async function getColorSetsByType(type: ColorType): Promise<ColorSetDefinition[]> {
  const db = await dbPromise;
  return await db.getAllFromIndex('color-sets', 'by-type', type);
}

export async function saveColorSet(colorSet: ColorSetDefinition): Promise<void> {
  const db = await dbPromise;
  colorSet.date = new Date();
  colorSet.id = await db.put('color-sets', colorSet);
}

export async function deleteColorSet(id: number): Promise<void> {
  const db = await dbPromise;
  await db.delete('color-sets', id);
}
