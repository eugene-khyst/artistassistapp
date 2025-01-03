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

/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: {url: string}[];
};

import {BACKGROUND_REMOVAL_DATA_URL, COMMIT_HASH} from '~/src/config';
import {saveAppSettings, saveImageFile} from '~/src/services/db';
import type {SampleImageDefinition} from '~/src/services/image';
import {fileToImageFile, SAMPLE_IMAGES} from '~/src/services/image';
import {TabKey} from '~/src/tabs';
import {fetchCacheFirst, fetchSWR} from '~/src/utils';

async function install(): Promise<void> {
  const cache = await caches.open(COMMIT_HASH);
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
  await Promise.all(keys.filter(key => key !== COMMIT_HASH).map(key => caches.delete(key)));
}
self.addEventListener('activate', event => {
  event.waitUntil(activate());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method === 'GET') {
    let response: Promise<Response>;
    if (url.origin === self.location.origin || url.href.startsWith(BACKGROUND_REMOVAL_DATA_URL)) {
      response = fetchCacheFirst(request);
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
