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

import {DATA_METADATA_TIMEOUT_MS, DATA_URL} from '@/config';
import {type CatalogItem} from '@/services/catalog';
import {fetchSWR} from '@/utils/fetch';
import {anySignal} from '@/utils/promise';

import {blobToImageFile, type ImageFile} from './image-file';

const STYLE_IMAGE_TIMEOUT_MS = 60 * 1000;

export const CUSTOM_STYLE_IMAGE_ID = 'custom-style-image';

export interface StyleImageDefinition extends CatalogItem {
  image: string;
  artist: string;
  title: string;
  tags?: string[];
}

export async function fetchStyleImages(): Promise<StyleImageDefinition[]> {
  const response = await fetchSWR(
    new Request(`${DATA_URL}/style-images.json`, {
      signal: AbortSignal.timeout(DATA_METADATA_TIMEOUT_MS),
    })
  );
  return (await response.json()) as StyleImageDefinition[];
}

export async function fetchStyleImageFile(url: string, signal?: AbortSignal): Promise<ImageFile> {
  const timeoutSignal = AbortSignal.timeout(STYLE_IMAGE_TIMEOUT_MS);
  const response = await fetch(new URL(url, DATA_URL), {
    mode: 'cors',
    signal: signal ? anySignal([signal, timeoutSignal]) : timeoutSignal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await blobToImageFile(await response.blob());
}
