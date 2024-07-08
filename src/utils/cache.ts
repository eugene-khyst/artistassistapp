/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {commitHash} from '~/src/config';

export async function fetchAndCache(url: string | URL): Promise<Response> {
  const response = await fetch(url);
  const cache = await caches.open(commitHash);
  void cache.put(url, response.clone());
  return response;
}
