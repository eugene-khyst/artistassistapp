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

import {COMMIT_HASH} from '~/src/config';
import {EXTENSION_TO_MIME_TYPE, getFileExtension, getUrlString, splitUrl} from '~/src/utils/url';

interface CachePutOptions {
  allowOpaqueResponses?: boolean;
  retry?: boolean;
  strict?: boolean;
}

interface Chunk {
  filename: string;
  size: number;
}

interface ChunkedFile {
  filename: string;
  size: number;
  chunks: Chunk[];
}

export type FetchProgressCallback = (key: string | null, progress?: number) => void;

interface FetchChunkedOptions {
  concurrency?: number;
  progressCallback?: FetchProgressCallback;
  signal?: AbortSignal | null;
}

export function getCacheName(cacheSuffix?: string): string {
  return [COMMIT_HASH, cacheSuffix].filter(Boolean).join('-');
}

export const CACHE_NAME_DEFAULT: string = getCacheName();

export function errorResponse(error: unknown) {
  return new Response(`Error: ${String(error)}`, {status: 500});
}

async function clearCache(cache: Cache) {
  const keys = await cache.keys();
  await Promise.allSettled(keys.map(key => cache.delete(key)));
}

export async function cachePutWithRetry(
  cache: Cache,
  request: RequestInfo | URL,
  response: Response,
  {allowOpaqueResponses = false, retry = false, strict = false}: CachePutOptions = {}
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
    if (allowOpaqueResponses) {
      console.log('Caching opaque response: success status unknown', request);
    } else {
      console.warn('Skipping cache: opaque response', request);
      if (strict) {
        throw new Error(`Opaque response for ${url}`);
      } else {
        return;
      }
    }
  }
  const extension: string | undefined = getFileExtension(url);
  const contentType = response.headers.get('Content-Type');
  if (!opaque && extension && !contentType) {
    console.warn(`Skipping cache: missing Content-Type for extension ${extension}`, request);
    if (strict) {
      throw new Error(`Missing Content-Type for ${url}`);
    } else {
      return;
    }
  }
  const expectedMimeTypes: string[] | undefined = extension
    ? EXTENSION_TO_MIME_TYPE[extension]
    : undefined;

  if (
    expectedMimeTypes?.length &&
    contentType &&
    !expectedMimeTypes.some(expectedMimeType => contentType.includes(expectedMimeType))
  ) {
    const message = `MIME type mismatch for ${url}: expected [${expectedMimeTypes.join(',')}], got ${contentType}`;
    console.warn('Skipping cache:', message, request);
    if (strict) {
      throw new Error(message);
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
      await cachePutWithRetry(cache, request, response, {allowOpaqueResponses, strict});
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
    const networkResponse = await fetch(request, {cache: 'no-cache'});
    await cachePutWithRetry(cache, request, networkResponse.clone(), {
      allowOpaqueResponses,
      retry: true,
    });
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

export async function fetchChunked(request: URL, options: FetchChunkedOptions): Promise<Response> {
  const [baseUrl] = splitUrl(request);
  const chunkedFile: ChunkedFile = await downloadChunkedFileInfo(request, options);
  const response: Response = await downloadChunks(baseUrl, chunkedFile, options);
  return response;
}

async function downloadChunkedFileInfo(
  url: URL,
  {signal}: FetchChunkedOptions
): Promise<ChunkedFile> {
  const infoUrl = `${url}.json`;
  const response: Response = await fetch(infoUrl, {signal, cache: 'no-cache'});
  if (!response.ok) {
    throw new Error(`Failed to download chunked file info ${infoUrl}`);
  }
  const chunkedFile = (await response.json()) as ChunkedFile;
  return chunkedFile;
}

async function downloadChunks(
  baseUrl: string,
  {filename, size, chunks}: ChunkedFile,
  {concurrency = 5, progressCallback, signal}: FetchChunkedOptions
): Promise<Response> {
  const downloadedChunks: Blob[] = [];
  let completedCount = 0;

  const queue = chunks.map((_, i) => i);
  let progress = 0;

  progressCallback?.(filename, progress);

  const abortController = new AbortController();
  signal?.addEventListener('abort', () => {
    abortController.abort(signal.reason);
  });

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const i = queue.shift()!;
      const chunk: Chunk = chunks[i]!;

      const response = await fetch(new URL(chunk.filename, baseUrl), {
        signal: abortController.signal,
      });
      if (!response.ok) {
        abortController.abort();
        throw new Error(`Failed to download file chunk ${chunk.filename}`);
      }

      const blob = await response.blob();
      downloadedChunks[i] = blob;
      completedCount++;

      progress = (completedCount / chunks.length) * 100;
      progressCallback?.(filename, progress);
    }
  }

  const workers = Array.from({length: Math.min(concurrency, chunks.length)}, () => worker());

  await Promise.all(workers);

  progressCallback?.(null);

  const combinedBlob = new Blob(downloadedChunks);
  return new Response(combinedBlob, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': size.toString(),
    },
  });
}

export function formatFetchProgress(key: string | null, progress?: number): string | null {
  return key ? `${progress?.toFixed(0) ?? 0}% (${key})` : null;
}
