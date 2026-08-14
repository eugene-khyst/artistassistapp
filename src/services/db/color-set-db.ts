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

import type {ColorSetDefinition} from '@eugene-khyst/artistassistapp-color-mixer';

import {markStoreChanged} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';

import {dbPromise} from './db';

export async function getAllColorSets(): Promise<ColorSetDefinition[]> {
  const db = await dbPromise;
  return await db.getAll('color-sets');
}

export async function saveColorSets(colorSets: ColorSetDefinition[]): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['color-sets', 'store-changes'], 'readwrite');
  const store = tx.objectStore('color-sets');
  const date = new Date();
  for (const colorSet of colorSets) {
    colorSet.date = date;
    colorSet.id = await store.put(colorSet);
  }
  const tokens: StoreChangeTokens = {
    'color-sets': await markStoreChanged(tx, 'color-sets'),
  };
  await tx.done;
  return tokens;
}

export async function deleteColorSet(id: number): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['color-sets', 'store-changes'], 'readwrite');
  await tx.objectStore('color-sets').delete(id);
  const tokens: StoreChangeTokens = {
    'color-sets': await markStoreChanged(tx, 'color-sets'),
  };
  await tx.done;
  return tokens;
}
