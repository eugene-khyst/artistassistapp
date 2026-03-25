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

/// <reference lib="WebWorker" />

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: {url: string}[];
};

import type {ColorSetDefinition, CustomColorBrandDefinition} from '~/src/services/color/types';
import {FileExtension} from '~/src/services/color/types';
import {getAppSettings, saveAppSettings} from '~/src/services/db/app-settings-db';
import {saveAuthErrorData, saveIdToken} from '~/src/services/db/auth-db';
import {saveColorSets} from '~/src/services/db/color-set-db';
import {saveCustomColorBrand} from '~/src/services/db/custom-brand-db';
import {saveImageFile} from '~/src/services/db/image-file-db';
import {fileToImageFile} from '~/src/services/image/image-file';
import type {SampleImageDefinition} from '~/src/services/image/sample-images';
import {SAMPLE_IMAGES} from '~/src/services/image/sample-images';
import type {AppSettings} from '~/src/services/settings/types';
import type {ServiceWorkerMessage} from '~/src/sw-message';
import {TabKey} from '~/src/tabs';
import {digestMessage} from '~/src/utils/digest';
import {
  CACHE_NAME_DEFAULT,
  cachePutWithRetry,
  fetchCacheFirst,
  fetchSWR,
  getCacheName,
} from '~/src/utils/fetch';

const CACHE_NAME_LARGE_FILES = getCacheName('large-files');
const CACHE_NAMES = new Set([CACHE_NAME_DEFAULT, CACHE_NAME_LARGE_FILES]);

const CACHE_LARGE_FILE_EXTENSIONS: RegExp[] = [/\.onnx\.part\d+$/, /\.wasm$/];
const SPA_PATHNAMES = new Set<string>([
  '/',
  ...Object.values(TabKey).map(tab => `/${tab}`),
  '/login',
  '/install',
]);

function isCloudflareBeacon(url: URL): boolean {
  return (
    url.origin === 'https://static.cloudflareinsights.com' && url.pathname === '/beacon.min.js'
  );
}

async function install(): Promise<void> {
  const cache = await caches.open(CACHE_NAME_DEFAULT);
  const criticalUrls: string[] = ['/', ...new Set(self.__WB_MANIFEST.map(({url}) => url))];
  const optionalUrls: string[] = SAMPLE_IMAGES.flatMap(
    ({image, thumbnail}: SampleImageDefinition): string[] => [image, thumbnail]
  );
  await Promise.all(
    criticalUrls.map(async url => {
      const request = new Request(url, {cache: 'reload'});
      const response = await fetch(request);
      await cachePutWithRetry(cache, request, response, {
        allowOpaqueResponses: true,
        retry: true,
        strict: true,
      });
    })
  );
  await Promise.allSettled(
    optionalUrls.map(async url => {
      try {
        const request = new Request(url, {cache: 'reload'});
        const response = await fetch(request);
        await cachePutWithRetry(cache, request, response, {
          allowOpaqueResponses: true,
          retry: true,
        });
      } catch (error) {
        console.error('Failed to cache optional asset', url, error);
      }
    })
  );
}
self.addEventListener('install', event => {
  event.waitUntil(install());
});

async function activate(): Promise<void> {
  const keys = await caches.keys();
  const oldCaches = keys.filter(key => !CACHE_NAMES.has(key));
  if (oldCaches.length > 0) {
    await Promise.all(oldCaches.map(key => caches.delete(key)));
  }
}
self.addEventListener('activate', event => {
  event.waitUntil(activate());
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const {request} = event;
  try {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      let response: Promise<Response>;
      if (url.origin === self.location.origin) {
        if (request.mode === 'navigate' && SPA_PATHNAMES.has(url.pathname)) {
          response = fetchCacheFirst(new Request('/'));
        } else if (request.mode === 'navigate') {
          response = fetch(request);
        } else {
          response = fetchCacheFirst(request);
        }
      } else if (CACHE_LARGE_FILE_EXTENSIONS.some(extension => extension.test(url.href))) {
        response = fetchCacheFirst(request, CACHE_NAME_LARGE_FILES);
      } else if (isCloudflareBeacon(url)) {
        response = fetch(request);
      } else {
        response = fetchSWR(request);
      }
      event.respondWith(response);
    } else if (request.method === 'POST' && url.origin === self.location.origin) {
      if (url.pathname === '/login/callback') {
        event.respondWith(receiveAuthCallback(request));
      } else if (url.pathname === '/share-target') {
        event.respondWith(receiveSharedData(request));
      }
    }
  } catch (error) {
    console.error('Service worker fetch error:', error);
    event.respondWith(fetch(request));
  }
});

async function receiveAuthCallback(request: Request): Promise<Response> {
  const redirectUrl = new URL('/', self.location.origin);
  try {
    const formData: FormData = await request.formData();
    const idToken = formData.get('id_token') as string | null;
    const error = formData.get('error') as string | null;
    const errorContext = formData.get('error_context') as string | null;

    if (idToken) {
      await saveIdToken(idToken);
    }
    if (error) {
      redirectUrl.searchParams.set('error', error);
      if (errorContext) {
        try {
          const parsedErrorContext = JSON.parse(errorContext) as Record<string, unknown>;
          await saveAuthErrorData({context: parsedErrorContext});
        } catch (e) {
          console.error('Failed to parse error context', e);
        }
      }
    }
  } catch (e) {
    console.error('Auth callback error', e);
    redirectUrl.searchParams.set('error', 'unknown');
  }
  return Response.redirect(redirectUrl.href, 303);
}

async function receiveSharedData(request: Request): Promise<Response> {
  const formData: FormData = await request.formData();
  // 'shared_files' = current; 'images' = legacy from older PWA installs
  const files = [...formData.getAll('shared_files'), ...formData.getAll('images')] as File[];
  const prevAppSettings: AppSettings = (await getAppSettings()) ?? {};
  let appSettings: AppSettings | undefined;
  for (const file of files) {
    try {
      const {name, type} = file;
      if (type.startsWith('image/')) {
        await saveImageFile(await fileToImageFile(file));
        appSettings = {
          activeTabKey: TabKey.Photo,
        };
      } else if (
        name.endsWith(FileExtension.ColorSet) ||
        name.endsWith(`${FileExtension.ColorSet}.json`)
      ) {
        const json: string = await file.text();
        const colorSets = JSON.parse(json) as ColorSetDefinition[];
        await saveColorSets(colorSets);
        const hash: string = await digestMessage(json);
        appSettings = {
          latestColorSetsJsonHash: hash,
          activeTabKey: TabKey.ColorSet,
        };
      } else if (
        name.endsWith(FileExtension.CustomColorBrand) ||
        name.endsWith(`${FileExtension.CustomColorBrand}.json`)
      ) {
        const json: string = await file.text();
        const brand = JSON.parse(json) as CustomColorBrandDefinition;
        await saveCustomColorBrand(brand);
        appSettings = {
          activeTabKey: TabKey.CustomColorBrand,
        };
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (appSettings) {
    await saveAppSettings({
      ...prevAppSettings,
      ...appSettings,
    });
  }
  return Response.redirect('/', 303);
}

self.addEventListener('message', event => {
  const data = event.data as ServiceWorkerMessage | null | undefined;
  if (data === 'skipWaiting') {
    void self.skipWaiting();
  }
});
