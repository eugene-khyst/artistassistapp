/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

export const errorResponse = (error: any) => new Response(`Error: ${error}`, {status: 500});

export async function fetchCacheFirst(request: Request): Promise<Response> {
  try {
    const cache: Cache = await caches.open(COMMIT_HASH);
    const cachedResponse: Response | undefined = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const fetchedResponse: Response = await fetch(request);
    await cache.put(request, fetchedResponse.clone());
    return fetchedResponse;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function fetchSWR(request: string | URL | Request): Promise<Response> {
  const cache: Cache = await caches.open(COMMIT_HASH);
  const cachedResponse: Response | undefined = await cache.match(request);
  const fetchPromise: Promise<Response> = (async () => {
    try {
      const networkResponse = await fetch(request, {
        signal: AbortSignal.timeout(10000),
      });
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    } catch (error) {
      return errorResponse(error);
    }
  })();
  return cachedResponse ?? (await fetchPromise);
}
