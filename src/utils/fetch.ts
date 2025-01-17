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

import {COMMIT_HASH} from '~/src/config';
import {splitUrl} from '~/src/utils/url';

interface Chunk {
  filename: string;
  size: number;
}

interface ChunkedFile {
  filename: string;
  size: number;
  chunks: Chunk[];
}

export type ProgressCallback = (key: string, progress: number | 'auto') => void;

export function getCacheName(cacheSuffix?: string): string {
  return [COMMIT_HASH, cacheSuffix].filter(Boolean).join('-');
}

const CACHE_NAME: string = getCacheName();
const MB_1 = 1024 * 1024;
const MB_2 = 2 * MB_1;

export function errorResponse(error: any) {
  return new Response(`Error: ${error}`, {status: 500});
}

async function hasEnoughStorage(expectedBytes: number) {
  if ('storage' in navigator) {
    const {quota, usage} = await navigator.storage.estimate();
    return (quota ?? 0) - (usage ?? 0) > expectedBytes;
  }
  return false;
}

async function clearCache(cache: Cache) {
  const keys = await cache.keys();
  await Promise.all(keys.map(key => cache.delete(key)));
}

async function cachePutWithRetry(
  cache: Cache,
  request: RequestInfo | URL,
  response: Response,
  expectedBytes: number,
  retry = true
): Promise<boolean> {
  try {
    await cache.put(request, response);
    return true;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
    console.error(`Failed to cache: ${request}`, error);
    if (retry && !(await hasEnoughStorage(expectedBytes))) {
      console.log('Clearing cache and retrying');
      await clearCache(cache);
      await cachePutWithRetry(cache, request, response, expectedBytes, false);
    }
  }
  return false;
}

export async function fetchCacheFirst(
  request: RequestInfo | URL,
  cacheName = CACHE_NAME,
  expectedBytes = MB_2
): Promise<Response> {
  try {
    const cache: Cache = await caches.open(cacheName);
    const cachedResponse: Response | undefined = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const networkResponse: Response = await fetch(request);
    await cachePutWithRetry(cache, request, networkResponse.clone(), expectedBytes);
    return networkResponse;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function fetchSWR(
  request: RequestInfo | URL,
  cacheName = CACHE_NAME,
  expectedBytes = MB_2
): Promise<Response> {
  const cache: Cache = await caches.open(cacheName);
  const cachedResponse: Response | undefined = await cache.match(request);
  const fetchPromise: Promise<Response> = (async () => {
    try {
      const networkResponse = await fetch(request);
      await cachePutWithRetry(cache, request, networkResponse.clone(), expectedBytes);
      return networkResponse;
    } catch (error) {
      return errorResponse(error);
    }
  })();
  return cachedResponse ?? (await fetchPromise);
}

export async function fetchChunked(
  request: URL,
  progressCallback?: ProgressCallback
): Promise<Response> {
  const chunkedFile: ChunkedFile = await downloadChunkedFileInfo(request);
  const [baseUrl] = splitUrl(request);
  return await downloadChunks(baseUrl, chunkedFile, progressCallback);
}

async function downloadChunkedFileInfo(
  url: URL,
  progressCallback?: ProgressCallback
): Promise<ChunkedFile> {
  const infoUrl = `${url}.json`;
  progressCallback?.(infoUrl, 'auto');
  const response: Response = await fetch(infoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download chunked file info ${infoUrl}`);
  }
  const chunkedFile = (await response.json()) as ChunkedFile;
  return chunkedFile;
}

async function downloadChunks(
  baseUrl: string,
  {filename, size, chunks}: ChunkedFile,
  progressCallback?: ProgressCallback
): Promise<Response> {
  const downloadedChunks: Blob[] = [];

  await Promise.all(
    chunks.map(async ({filename}, i) => {
      const response = await fetch(new URL(filename, baseUrl));
      if (!response.ok) {
        throw new Error(`Failed to download file chunk ${filename}`);
      }
      const blob = await response.blob();
      downloadedChunks[i] = blob;
      if (progressCallback) {
        const progress = (downloadedChunks.filter(Boolean).length / chunks.length) * 100;
        progressCallback(`Fetching ${filename}`, progress);
      }
    })
  );

  const combinedBlob = new Blob(downloadedChunks);
  return new Response(combinedBlob, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': size.toString(),
    },
  });
}
