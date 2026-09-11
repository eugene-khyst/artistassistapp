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

import type {OnnxModel} from '@/services/ml/types';
import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import {digestMessage} from '@/utils/digest';
import {canonicalize} from '@/utils/json';

import {getAppSettings} from './app-settings-db';
import {dbPromise} from './db';

const PROCESSED_IMAGE_CACHE_VERSION = 2;
const MAX_PROCESSED_IMAGES = 20;

export interface ProcessedImage {
  key: string;
  digests: string[];
  blob: Blob;
  date: Date;
}

async function processedImageKey(model: OnnxModel, digests: string[]): Promise<string> {
  const {priority: _priority, freeTier: _freeTier, ...rest} = model;
  const modelDigest = await digestMessage(JSON.stringify(canonicalize(rest)));
  const {webGpuEnabled} = {...DEFAULT_APP_SETTINGS, ...(await getAppSettings())};
  return [
    PROCESSED_IMAGE_CACHE_VERSION,
    modelDigest,
    webGpuEnabled ? 'webgpu' : 'wasm',
    ...digests,
  ].join('|');
}

export async function getProcessedImage(
  model: OnnxModel,
  digests: string[]
): Promise<Blob | undefined> {
  const key = await processedImageKey(model, digests);
  const db = await dbPromise;
  return (await db.get('processed-images', key))?.blob;
}

export async function saveProcessedImage(
  model: OnnxModel,
  digests: string[],
  blob: Blob
): Promise<void> {
  const key = await processedImageKey(model, digests);
  const db = await dbPromise;
  const tx = db.transaction('processed-images', 'readwrite');
  const store = tx.store;
  await store.put({
    key,
    digests,
    blob,
    date: new Date(),
  });
  let count = await store.count();
  let cursor = await store.index('by-date').openCursor();
  while (cursor && count > MAX_PROCESSED_IMAGES) {
    await cursor.delete();
    cursor = await cursor.continue();
    count--;
  }
  await tx.done;
}

export async function clearProcessedImages(): Promise<void> {
  const db = await dbPromise;
  await db.clear('processed-images');
}
