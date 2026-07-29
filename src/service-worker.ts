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

import {AUTH_URL} from '@/config';
import {fromCustomColorBrandSource, parseCustomColorBrandJson} from '@/services/cloud/cloud-state';
import {replaceStateFromZip} from '@/services/cloud/state-zip';
import {FileExtension} from '@/services/cloud/types';
import {updateStoredAppSettings} from '@/services/db/app-settings-db';
import {saveCustomColorBrands} from '@/services/db/custom-brand-db';
import {saveNewImageFiles} from '@/services/db/image-file-db';
import {fileToImageFile} from '@/services/image/image-file';
import {type AppSettings} from '@/services/settings/types';
import type {ServiceWorkerMessage} from '@/sw-message';
import {TabKey} from '@/tabs';
import {
  CACHE_NAME_DEFAULT,
  cachePutWithRetry,
  fetchCacheFirst,
  fetchSWR,
  getCacheName,
} from '@/utils/fetch';

const CACHE_NAME_LARGE_FILES = getCacheName('large-files');
const CACHE_NAMES = new Set([CACHE_NAME_DEFAULT, CACHE_NAME_LARGE_FILES]);
const AUTH_ORIGIN = new URL(AUTH_URL).origin;

const CACHE_LARGE_FILE_EXTENSIONS: RegExp[] = [/\.onnx\.part\d+$/, /\.wasm$/];

const SPA_PATHNAMES = new Set<string>([
  '/',
  ...Object.values(TabKey).map(tab => `/${tab}`),
  '/cloud/callback',
  '/install',
  '/login/callback',
  '/logged-out',
]);

function normalizeSpaPathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}

function shouldBypassRuntimeCache(request: Request, url: URL): boolean {
  return (
    request.cache === 'no-store' ||
    request.headers.has('Authorization') ||
    url.origin === AUTH_ORIGIN
  );
}

function isCloudflareBeacon(url: URL): boolean {
  return (
    url.origin === 'https://static.cloudflareinsights.com' && url.pathname === '/beacon.min.js'
  );
}

async function install(): Promise<void> {
  const cache = await caches.open(CACHE_NAME_DEFAULT);
  const criticalUrls: string[] = ['/', ...new Set(self.__WB_MANIFEST.map(({url}) => url))];
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
    if (request.method === 'HEAD') {
      return;
    }
    if (request.method === 'GET') {
      let response: Promise<Response>;
      if (shouldBypassRuntimeCache(request, url) || isCloudflareBeacon(url)) {
        return;
      } else if (CACHE_LARGE_FILE_EXTENSIONS.some(extension => extension.test(url.pathname))) {
        response = fetchCacheFirst(request, CACHE_NAME_LARGE_FILES);
      } else if (url.origin === self.location.origin) {
        if (request.mode === 'navigate' && SPA_PATHNAMES.has(normalizeSpaPathname(url.pathname))) {
          response = fetchCacheFirst(new Request('/'));
        } else if (request.mode === 'navigate') {
          response = fetch(request);
        } else {
          response = fetchCacheFirst(request);
        }
      } else {
        response = fetchSWR(request);
      }
      event.respondWith(response);
    } else if (request.method === 'POST' && url.origin === self.location.origin) {
      if (url.pathname === '/share-target') {
        event.respondWith(receiveSharedData(request));
      }
    }
  } catch (error) {
    console.error('Service worker fetch error:', error);
    event.respondWith(fetch(request));
  }
});

async function receiveSharedData(request: Request): Promise<Response> {
  const formData: FormData = await request.formData();
  // 'shared_files' = current; 'images' = legacy from older PWA installs
  const files = [...formData.getAll('shared_files'), ...formData.getAll('images')] as File[];
  let appSettings: Partial<AppSettings> | undefined;
  for (const file of files) {
    try {
      const {name, type} = file;
      const normalizedName = name.toLowerCase();
      if (type.startsWith('image/')) {
        await saveNewImageFiles([await fileToImageFile(file)]);
        appSettings = {
          activeTabKey: TabKey.Photo,
        };
      } else if (
        normalizedName.endsWith(FileExtension.State) ||
        normalizedName.endsWith(`${FileExtension.State}.zip`)
      ) {
        await replaceStateFromZip(file);
      } else if (
        normalizedName.endsWith(FileExtension.CustomColorBrand) ||
        normalizedName.endsWith(`${FileExtension.CustomColorBrand}.json`)
      ) {
        const brand = parseCustomColorBrandJson(await file.text());
        if (brand) {
          await saveCustomColorBrands([fromCustomColorBrandSource(brand)]);
          appSettings = {
            activeTabKey: TabKey.CustomColorBrand,
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (appSettings) {
    await updateStoredAppSettings(prev => ({
      ...prev,
      ...appSettings,
    }));
  }
  return Response.redirect('/', 303);
}

self.addEventListener('message', event => {
  const data = event.data as ServiceWorkerMessage | null | undefined;
  if (data === 'skipWaiting') {
    void self.skipWaiting();
  }
});
