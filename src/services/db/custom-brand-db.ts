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

import type {
  ColorSetDefinition,
  ColorType,
  CustomColorBrandDefinition,
} from '@eugene-khyst/artistassistapp-color-mixer';

import {markStoreChanged} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';

import {dbPromise} from './db';

export async function getCustomColorBrand(
  id: number
): Promise<CustomColorBrandDefinition | undefined> {
  const db = await dbPromise;
  return await db.get('custom-brands', id);
}

export async function getAllCustomColorBrands(): Promise<CustomColorBrandDefinition[]> {
  const db = await dbPromise;
  return await db.getAll('custom-brands');
}

export async function getCustomColorBrandsByType(
  type: ColorType
): Promise<CustomColorBrandDefinition[]> {
  const db = await dbPromise;
  return await db.getAllFromIndex('custom-brands', 'by-type', type);
}

export async function saveCustomColorBrands(
  brands: CustomColorBrandDefinition[]
): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['custom-brands', 'store-changes'], 'readwrite');
  const store = tx.objectStore('custom-brands');
  for (const brand of brands) {
    brand.date = new Date();
    brand.id = await store.put(brand);
  }
  const tokens: StoreChangeTokens = {
    'custom-brands': await markStoreChanged(tx, 'custom-brands'),
  };
  await tx.done;
  return tokens;
}

export async function deleteCustomColorBrand(brandId: number): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['custom-brands', 'color-sets', 'store-changes'], 'readwrite');
  await tx.objectStore('custom-brands').delete(brandId);
  const colorSetsStore = tx.objectStore('color-sets');
  const colorSets: ColorSetDefinition[] = await colorSetsStore.getAll();
  let colorSetsChanged = false;
  for (const {id: colorSetId, brands} of colorSets) {
    if (brands?.includes(brandId)) {
      await colorSetsStore.delete(colorSetId!);
      colorSetsChanged = true;
    }
  }
  const tokens: StoreChangeTokens = {
    'custom-brands': await markStoreChanged(tx, 'custom-brands'),
  };
  if (colorSetsChanged) {
    tokens['color-sets'] = await markStoreChanged(tx, 'color-sets');
  }
  await tx.done;
  return tokens;
}
