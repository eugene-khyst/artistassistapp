/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export async function fetchAndCache(url: string | URL | globalThis.Request): Promise<Response> {
  const response = await fetch(url);
  // const cache = await caches.open(commitHash);
  // void cache.put(url, response.clone());
  return response;
}
