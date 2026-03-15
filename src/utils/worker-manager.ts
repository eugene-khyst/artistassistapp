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

import type {Remote} from 'comlink';
import {wrap} from 'comlink';

import {abortablePromise, isAbortError} from '~/src/utils/promise';

export class WorkerManager<T> {
  private worker: Worker | null = null;
  private remote: Remote<T> | null = null;

  constructor(private readonly workerSupplier: () => Worker) {}

  getRemote(): Remote<T> {
    if (!this.worker) {
      this.worker = this.workerSupplier();
      this.remote = wrap<T>(this.worker);
    }
    return this.remote!;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.remote = null;
    }
  }

  async run<R>(operation: (remote: Remote<T>) => Promise<R>, signal?: AbortSignal): Promise<R> {
    const workerPromise = operation(this.getRemote());
    try {
      return await abortablePromise(workerPromise, signal);
    } catch (error) {
      if (isAbortError(error)) {
        this.terminate();
      }
      throw error;
    }
  }
}
