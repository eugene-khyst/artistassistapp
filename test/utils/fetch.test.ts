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

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {fetchJson} from '@/utils/fetch';

const cache = {
  delete: vi.fn(async (): Promise<boolean> => true),
  keys: vi.fn(async (): Promise<readonly Request[]> => []),
  match: vi.fn(async (): Promise<Response | undefined> => undefined),
  put: vi.fn(async (): Promise<void> => undefined),
};

beforeEach(() => {
  vi.stubGlobal('caches', {
    open: vi.fn(async (): Promise<typeof cache> => cache),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Object.values(cache).forEach(mock => {
    mock.mockClear();
  });
});

describe('fetchJson', () => {
  it('returns parsed JSON for a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async (): Promise<Response> =>
          new Response(JSON.stringify({value: 1}), {
            headers: {'Content-Type': 'application/json'},
          })
      )
    );

    await expect(
      fetchJson<{value: number}>('https://example.com/data.json', {timeoutMs: 1000})
    ).resolves.toEqual({value: 1});
  });

  it('rejects a non-successful response before parsing JSON', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (): Promise<Response> => new Response('Unavailable', {status: 503}))
    );

    await expect(fetchJson('https://example.com/data.json', {timeoutMs: 1000})).rejects.toThrow(
      'HTTP 503 while fetching https://example.com/data.json'
    );
  });

  it('preserves a timeout hidden by fetchSWR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (input: RequestInfo | URL): Promise<Response> =>
          new Promise((_, reject) => {
            const request = input as Request;
            if (request.signal.aborted) {
              reject(request.signal.reason);
              return;
            }
            request.signal.addEventListener(
              'abort',
              () => {
                reject(request.signal.reason);
              },
              {
                once: true,
              }
            );
          })
      )
    );

    await expect(fetchJson('https://example.com/data.json', {timeoutMs: 1})).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });

  it('rejects with the caller reason when the caller signal aborts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL): Promise<Response> =>
        Promise.reject((input as Request).signal.reason)
      )
    );
    const controller = new AbortController();
    controller.abort(new Error('caller aborted'));

    await expect(
      fetchJson('https://example.com/data.json', {timeoutMs: 1000, signal: controller.signal})
    ).rejects.toThrow('caller aborted');
  });
});
