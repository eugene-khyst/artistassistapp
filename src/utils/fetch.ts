/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {commitHash} from '~/src/config';

export const errorResponse = (error: any) => new Response(`Error: ${error}`, {status: 500});

export async function fetchSWR(request: string | URL | Request): Promise<Response> {
  const cache: Cache = await caches.open(commitHash);
  const cacheResponse: Response | undefined = await cache.match(request);
  const fetchPromise: Promise<Response> = (async () => {
    try {
      const networkResponse = await fetch(request, {
        signal: AbortSignal.timeout(15000),
      });
      void cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (error) {
      return errorResponse(error);
    }
  })();
  return cacheResponse || (await fetchPromise);
}
