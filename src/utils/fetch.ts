/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {commitHash} from '~/src/config';

export async function fetchAndCache(request: string | URL | Request): Promise<Response> {
  const response: Response = await fetch(request);
  const cache: Cache = await caches.open(commitHash);
  const cacheResponse: Response | undefined = await caches.match(request);
  if (cacheResponse?.headers.get('ETag') !== response.headers.get('ETag')) {
    void cache.put(request, response.clone());
    console.log('Caching', request);
    console.log('Old ETag', cacheResponse?.headers.get('ETag'));
    console.log('New ETag', response.headers.get('ETag'));
  }
  return response;
}
