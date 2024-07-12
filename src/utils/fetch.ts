/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {commitHash} from '~/src/config';

export const errorResponse = (error: any) => new Response(`Error: ${error}`, {status: 500});

export async function fetchSWR(request: string | URL | Request): Promise<Response> {
  const cache: Cache = await caches.open(commitHash);
  const cacheResponse = await cache.match(request);
  const fetchPromise = fetch(request).then(function (networkResponse) {
    void cache.put(request, networkResponse.clone());
    return networkResponse;
  });
  if (cacheResponse) {
    return cacheResponse;
  }
  try {
    return await fetchPromise;
  } catch (error) {
    return errorResponse(error);
  }
}
