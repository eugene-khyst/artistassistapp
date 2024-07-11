/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {commitHash} from '~/src/config';

export async function fetchWithTimeout(
  url: string | URL | globalThis.Request,
  timeout = 5000
): Promise<Response> {
  return await fetch(url, {
    signal: AbortSignal.timeout(timeout),
  });
}

export async function fetchAndCache(
  url: string | URL | globalThis.Request,
  timeout = 5000
): Promise<Response> {
  const response = await fetchWithTimeout(url, timeout);
  const cache = await caches.open(commitHash);
  void cache.put(url, response.clone());
  return response;
}
