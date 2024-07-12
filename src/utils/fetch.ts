/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {commitHash} from '~/src/config';

export async function fetchAndCache(request: string | URL | Request): Promise<Response> {
  const cache: Cache = await caches.open(commitHash);
  const cacheResponse = await cache.match(request);
  const fetchPromise = fetch(request).then(function (networkResponse) {
    void cache.put(request, networkResponse.clone());
    return networkResponse;
  });
  return cacheResponse || (await fetchPromise);
}
