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

import {getErrorMessage} from '~/src/utils/error';

const ABORT_ERROR_NAME = 'AbortError';

function createAbortError(reason?: unknown): DOMException {
  return new DOMException(getErrorMessage(reason), ABORT_ERROR_NAME);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === ABORT_ERROR_NAME;
}

export function abortablePromise<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    throw createAbortError(signal.reason);
  }

  const abortPromise = new Promise<never>((_, reject) => {
    signal.addEventListener(
      'abort',
      () => {
        reject(createAbortError(signal.reason));
      },
      {once: true}
    );
  });

  return Promise.race([promise, abortPromise]);
}
