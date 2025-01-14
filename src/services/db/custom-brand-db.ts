/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import type {
  ColorSetDefinition,
  ColorType,
  CustomColorBrandDefinition,
} from '~/src/services/color/types';

import {dbPromise} from './db';

export async function getLastCustomColorBrand(): Promise<CustomColorBrandDefinition | undefined> {
  const db = await dbPromise;
  const index = db.transaction('custom-brands').store.index('by-date');
  const cursor = await index.openCursor(null, 'prev');
  return cursor?.value;
}

export async function getCustomColorBrand(
  id: number
): Promise<CustomColorBrandDefinition | undefined> {
  const db = await dbPromise;
  return await db.get('custom-brands', id);
}

export async function getCustomColorBrands(): Promise<CustomColorBrandDefinition[]> {
  const db = await dbPromise;
  return await db.getAll('custom-brands');
}

export async function getCustomColorBrandsByType(
  type: ColorType
): Promise<CustomColorBrandDefinition[]> {
  const db = await dbPromise;
  return await db.getAllFromIndex('custom-brands', 'by-type', type);
}

export async function saveCustomColorBrand(brand: CustomColorBrandDefinition): Promise<void> {
  const db = await dbPromise;
  brand.date = new Date();
  brand.id = await db.put('custom-brands', brand);
}

export async function deleteCustomColorBrand(brandId: number): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['custom-brands', 'color-sets'], 'readwrite');
  await tx.objectStore('custom-brands').delete(brandId);
  const colorSetsStore = tx.objectStore('color-sets');
  const colorSets: ColorSetDefinition[] = await colorSetsStore.getAll();
  await Promise.all(
    colorSets.map(async ({id: colorSetId, brands}) => {
      if (brands?.includes(brandId)) {
        await colorSetsStore.delete(colorSetId!);
      }
    })
  );
  await tx.done;
}
