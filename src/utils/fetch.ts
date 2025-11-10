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
import {EXTENSION_TO_MIME_TYPE, getFileExtension, getUrlString, splitUrl} from '~/src/utils/url';

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

export const CACHE_NAME_DEFAULT: string = getCacheName();

export function errorResponse(error: any) {
  return new Response(`Error: ${error}`, {status: 500});
}

async function clearCache(cache: Cache) {
  const keys = await cache.keys();
  await Promise.allSettled(keys.map(key => cache.delete(key)));
}

export async function cachePutWithRetry(
  cache: Cache,
  request: RequestInfo | URL,
  response: Response,
  allowOpaqueResponses: boolean,
  retry = false,
  strict = false
): Promise<void> {
  const url: string = getUrlString(request);
  if (!response.ok) {
    console.warn(`Skipping cache: non-successful response (${response.status})`, request);
    if (strict) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    } else {
      return;
    }
  }
  const opaque: boolean = response.type === 'opaque' || response.type === 'opaqueredirect';
  if (opaque) {
    if (!allowOpaqueResponses) {
      console.warn('Skipping cache: opaque response', request);
      if (strict) {
        throw new Error(`Opaque response for ${url}`);
      } else {
        return;
      }
    } else {
      console.log('Caching opaque response: success status unknown', request);
    }
  }
  const extension: string | undefined = getFileExtension(url);
  const expectedMimeType: string | undefined = extension && EXTENSION_TO_MIME_TYPE[extension];
  const contentType = response.headers.get('Content-Type');
  if (!opaque && extension && !contentType) {
    console.warn(`Skipping cache: missing Content-Type for extension ${extension}`, request);
    if (strict) {
      throw new Error(`Missing Content-Type for ${url}`);
    } else {
      return;
    }
  }
  if (expectedMimeType && contentType && !contentType.includes(expectedMimeType)) {
    console.warn(
      `Skipping cache: MIME type mismatch, expected ${expectedMimeType}, got ${contentType}`,
      request
    );
    if (strict) {
      throw new Error(`MIME mismatch for ${url}: expected ${expectedMimeType}, got ${contentType}`);
    } else {
      return;
    }
  }
  try {
    await cache.put(request, response.clone());
  } catch (error) {
    console.error('Failed to cache', request, error);
    if (retry) {
      console.log('Clearing cache and retrying');
      await clearCache(cache);
      await cachePutWithRetry(cache, request, response, allowOpaqueResponses, false, strict);
    } else if (strict) {
      throw new Error(`Failed to cache ${url}`);
    }
  }
}

export async function fetchNetwork(
  request: RequestInfo | URL,
  cache: Cache,
  allowOpaqueResponses: boolean
): Promise<Response> {
  try {
    const networkResponse = await fetch(request);
    await cachePutWithRetry(cache, request, networkResponse.clone(), allowOpaqueResponses, true);
    return networkResponse;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function fetchCacheFirst(
  request: RequestInfo | URL,
  cacheName = CACHE_NAME_DEFAULT
): Promise<Response> {
  try {
    const cache: Cache = await caches.open(cacheName);
    const cachedResponse: Response | undefined = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return await fetchNetwork(request, cache, false);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function fetchSWR(
  request: RequestInfo | URL,
  cacheName = CACHE_NAME_DEFAULT
): Promise<Response> {
  try {
    const cache: Cache = await caches.open(cacheName);
    const cachedResponse: Response | undefined = await cache.match(request);
    const fetchPromise: Promise<Response> = fetchNetwork(request, cache, true);
    return cachedResponse ?? (await fetchPromise);
  } catch (error) {
    return errorResponse(error);
  }
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
