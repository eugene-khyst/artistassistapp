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

/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: {url: string}[];
};

import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {saveImageFile} from '~/src/services/db/image-file-db';
import {fileToImageFile} from '~/src/services/image/image-file';
import type {SampleImageDefinition} from '~/src/services/image/sample-images';
import {SAMPLE_IMAGES} from '~/src/services/image/sample-images';
import {TabKey} from '~/src/tabs';
import {fetchCacheFirst, fetchSWR, getCacheName} from '~/src/utils/fetch';

const MB_1 = 1024 * 1024;
const MB_20 = 20 * MB_1;

const CACHE_NAME = getCacheName();
const CACHE_NAME_DATA = getCacheName('data');
const CACHE_NAMES = [CACHE_NAME, CACHE_NAME_DATA];

const CACHE_EXTENSIONS = ['.onnx', '.wasm'];

async function install(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll([
    '/',
    ...new Set(self.__WB_MANIFEST.map(({url}) => url)),
    ...SAMPLE_IMAGES.flatMap(({image, thumbnail}: SampleImageDefinition): string[] => [
      image,
      thumbnail,
    ]),
  ]);
}
self.addEventListener('install', event => {
  event.waitUntil(install());
});

async function activate(): Promise<void> {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter(key => !CACHE_NAMES.some(cacheName => key === cacheName))
      .map(key => caches.delete(key))
  );
}
self.addEventListener('activate', event => {
  event.waitUntil(activate());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method === 'GET') {
    let response: Promise<Response>;
    if (url.origin === self.location.origin) {
      response = fetchCacheFirst(request);
    } else if (CACHE_EXTENSIONS.some(extension => url.href.endsWith(extension))) {
      response = fetchCacheFirst(request, CACHE_NAME_DATA, MB_20);
    } else {
      response = fetchSWR(request);
    }
    event.respondWith(response);
  } else if (
    request.method === 'POST' &&
    url.origin === self.location.origin &&
    url.pathname === '/share-target'
  ) {
    event.respondWith(receiveSharedData(request));
  }
});

async function receiveSharedData(request: Request): Promise<Response> {
  const formData: FormData = await request.formData();
  const files = formData.getAll('images') as File[];
  for (const file of files) {
    await saveImageFile(await fileToImageFile(file));
    await saveAppSettings({
      activeTabKey: TabKey.Photo,
    });
  }
  return Response.redirect('/', 303);
}

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    void self.skipWaiting();
  }
});
