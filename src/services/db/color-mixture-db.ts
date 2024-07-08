/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ColorMixture} from '~/src/services/color';

import {dbPromise} from './db';

export async function getColorMixtures(imageFileId?: number | null): Promise<ColorMixture[]> {
  const db = await dbPromise;
  return await db.transaction('color-mixtures').store.index('by-imageFileId').getAll(imageFileId);
}

export async function saveColorMixture(colorMixture: ColorMixture): Promise<ColorMixture> {
  const db = await dbPromise;
  const id: number = await db.put('color-mixtures', colorMixture);
  return {
    ...colorMixture,
    id,
  };
}

export async function deleteColorMixture(id: number): Promise<void> {
  const db = await dbPromise;
  await db.delete('color-mixtures', id);
}
