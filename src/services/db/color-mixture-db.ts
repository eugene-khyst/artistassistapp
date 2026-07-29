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

import type {ColorMixture} from '@/services/color/types';
import {markStoreChanged} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';

import {dbPromise} from './db';

export const EMPTY_DIGEST = '';

export async function getAllColorMixtures(): Promise<ColorMixture[]> {
  const db = await dbPromise;
  return await db.getAll('color-mixtures');
}

export async function getColorMixturesByDigest(
  imageFileDigest?: string | null
): Promise<ColorMixture[]> {
  const db = await dbPromise;
  const index = db.transaction('color-mixtures').store.index('by-imageFileDigest');
  return (await index.getAll(EMPTY_DIGEST)).concat(
    imageFileDigest ? await index.getAll(imageFileDigest) : []
  );
}

export async function saveColorMixture(
  colorMixture: ColorMixture,
  {preserveDate = false}: {preserveDate?: boolean} = {}
): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['color-mixtures', 'store-changes'], 'readwrite');
  colorMixture.imageFileDigest ??= EMPTY_DIGEST;
  const date = new Date();
  colorMixture.date = preserveDate ? colorMixture.date : date;
  colorMixture.date ??= date;
  colorMixture.id = await tx.objectStore('color-mixtures').put(colorMixture);
  const tokens: StoreChangeTokens = {
    'color-mixtures': await markStoreChanged(tx, 'color-mixtures'),
  };
  await tx.done;
  return tokens;
}

export async function deleteColorMixture(id: number): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['color-mixtures', 'store-changes'], 'readwrite');
  await tx.objectStore('color-mixtures').delete(id);
  const tokens: StoreChangeTokens = {
    'color-mixtures': await markStoreChanged(tx, 'color-mixtures'),
  };
  await tx.done;
  return tokens;
}
