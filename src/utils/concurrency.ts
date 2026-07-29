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

import {clamp} from '@/utils/math-utils';

interface ConcurrentMapOptions {
  concurrency?: number;
}

export async function mapConcurrent<T, R>(
  values: readonly T[],
  mapper: (value: T, index: number) => Promise<R>,
  {concurrency = 3}: ConcurrentMapOptions = {}
): Promise<R[]> {
  if (values.length === 0) {
    return [];
  }

  const results: R[] = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]!, index);
    }
  }

  const normalizedConcurrency = Number.isFinite(concurrency) ? Math.trunc(concurrency) : 1;
  const workerCount = clamp(normalizedConcurrency, 1, values.length);
  await Promise.all(Array.from({length: workerCount}, () => worker()));

  return results;
}

export function dedupeConcurrentCalls<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  let pending: Promise<Result> | null = null;

  return async (...args: Args): Promise<Result> => {
    if (pending) {
      return pending;
    }
    const promise = (async () => action(...args))();
    pending = promise;
    try {
      return await promise;
    } finally {
      if (pending === promise) {
        pending = null;
      }
    }
  };
}

// Like dedupeConcurrentCalls, but a call during a run queues one trailing rerun.
export function coalesceConcurrentCalls(action: () => Promise<void>): () => Promise<void> {
  let pending: Promise<void> | null = null;
  let queued = false;

  const run = async (): Promise<void> => {
    await action();
    if (queued) {
      queued = false;
      await run();
    }
  };

  return (): Promise<void> => {
    if (pending) {
      queued = true;
      return pending;
    }
    pending = run().finally(() => {
      pending = null;
      queued = false;
    });
    return pending;
  };
}
