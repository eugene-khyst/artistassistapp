/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope;

import {manifest} from '@parcel/service-worker';

import {commitHash} from '~/src/config';
import {saveAppSettings, saveImageFile} from '~/src/services/db';
import {TabKey} from '~/src/types';
import {fetchWithTimeout} from '~/src/utils';

const errorResponse = (error: any) => new Response(`Error: ${error}`, {status: 500});

async function install(): Promise<void> {
  const cache = await caches.open(commitHash);
  await cache.addAll(['/', ...new Set(manifest)]);
}
self.addEventListener('install', event => {
  event.waitUntil(install());
});

async function activate(): Promise<void> {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key !== commitHash).map(key => caches.delete(key)));
}
self.addEventListener('activate', event => event.waitUntil(activate()));

self.addEventListener('fetch', (event: FetchEvent) => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.method === 'GET') {
    if (url.origin === location.origin) {
      event.respondWith(cacheThenNetwork(request));
    } else {
      event.respondWith(networkThenCache(request));
    }
  } else if (request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async (): Promise<Response> => {
        const formData: FormData = await event.request.formData();
        const files = formData.getAll('images') as File[];
        for (const file of files) {
          await saveImageFile({
            file,
            date: new Date(),
          });
          await saveAppSettings({
            activeTabKey: TabKey.Photo,
          });
        }
        return Response.redirect('/', 303);
      })()
    );
  }
});

async function cacheThenNetwork(request: Request): Promise<Response> {
  try {
    const cacheResponse = await caches.match(request);
    return cacheResponse || (await fetchWithTimeout(request));
  } catch (e) {
    return errorResponse(e);
  }
}

async function networkThenCache(request: Request): Promise<Response> {
  try {
    return await fetchWithTimeout(request);
  } catch (e) {
    const cacheResponse = await caches.match(request);
    return cacheResponse || errorResponse(e);
  }
}

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    void self.skipWaiting();
  }
});
