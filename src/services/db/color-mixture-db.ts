/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ColorMixture} from '~/src/services/color';

import {dbPromise} from './db';

export async function getColorMixtures(imageFileId?: number | null): Promise<ColorMixture[]> {
  const db = await dbPromise;
  const index = db.transaction('color-mixtures').store.index('by-imageFileId');
  return (await index.getAll(0)).concat(imageFileId ? await index.getAll(imageFileId) : []);
}

export async function saveColorMixture({
  imageFileId,
  ...colorMixture
}: ColorMixture): Promise<ColorMixture> {
  const db = await dbPromise;
  const savedColorMixture: ColorMixture = {
    ...colorMixture,
    imageFileId: imageFileId ?? 0,
  };
  const id: number = await db.put('color-mixtures', savedColorMixture);
  return {
    ...savedColorMixture,
    id,
  };
}

export async function deleteColorMixture(id: number): Promise<void> {
  const db = await dbPromise;
  await db.delete('color-mixtures', id);
}
