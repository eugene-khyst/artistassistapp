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

import type {ColorMixture} from '~/src/services/color';

import {dbPromise} from './db';

export async function getColorMixtures(imageFileId?: number | null): Promise<ColorMixture[]> {
  const db = await dbPromise;
  const index = db.transaction('color-mixtures').store.index('by-imageFileId');
  return (await index.getAll(0)).concat(imageFileId ? await index.getAll(imageFileId) : []);
}

export async function saveColorMixture(colorMixture: ColorMixture): Promise<void> {
  const db = await dbPromise;
  colorMixture.imageFileId = colorMixture.imageFileId ?? 0;
  if (!colorMixture.id) {
    colorMixture.date = new Date();
  }
  colorMixture.id = await db.put('color-mixtures', colorMixture);
}

export async function deleteColorMixture(id: number): Promise<void> {
  const db = await dbPromise;
  await db.delete('color-mixtures', id);
}
