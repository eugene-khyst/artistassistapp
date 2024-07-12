/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {commitHash} from '~/src/config';

export async function fetchAndCache(request: string | URL | Request): Promise<Response> {
  const response: Response = await fetch(request);
  const cache: Cache = await caches.open(commitHash);
  void cache.put(request, response.clone());
  console.log('Caching', request);
  console.log('Headers', response.headers);
  return response;
}
