/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope;

import {manifest} from '@parcel/service-worker';

import {commitHash} from '~/src/config';
import {saveAppSettings, saveImageFile} from '~/src/services/db';
import type {SampleImageDefinition} from '~/src/services/image';
import {SAMPLE_IMAGES} from '~/src/services/image';
import {TabKey} from '~/src/types';
import {errorResponse} from '~/src/utils';

async function install(): Promise<void> {
  const cache = await caches.open(commitHash);
  await cache.addAll([
    '/',
    ...new Set(manifest),
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
  await Promise.all(keys.filter(key => key !== commitHash).map(key => caches.delete(key)));
}
self.addEventListener('activate', event => event.waitUntil(activate()));

self.addEventListener('fetch', (event: FetchEvent) => {
  const {request} = event;
  const url = new URL(request.url);
  if (url.origin === location.origin) {
    if (request.method === 'GET') {
      event.respondWith(cacheFirst(request));
    } else if (request.method === 'POST') {
      event.waitUntil(receiveSharedData(request));
    }
  }
});

async function cacheFirst(request: Request): Promise<Response> {
  try {
    const cacheResponse: Response | undefined = await caches.match(request);
    return cacheResponse || (await fetch(request));
  } catch (error) {
    return errorResponse(error);
  }
}

async function receiveSharedData(request: Request): Promise<void> {
  const formData: FormData = await request.formData();
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
}

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    void self.skipWaiting();
  }
});
