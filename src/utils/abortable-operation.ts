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

import {ForceLogoutError} from '@/services/auth/errors';
import {isAbortError} from '@/utils/promise';

export function createAbortableOperation({
  onStart,
  onFinish,
}: {onStart?: () => void; onFinish?: () => void} = {}) {
  let abortController: AbortController | null = null;

  const run = async <T>(task: (signal: AbortSignal) => T | Promise<T>): Promise<T | undefined> => {
    abort();
    const controller = new AbortController();
    abortController = controller;

    try {
      onStart?.();
      const result = await task(controller.signal);
      controller.signal.throwIfAborted();
      return result;
    } catch (error) {
      // A superseded run stays silent, but a broken session must still reach the logout handler.
      if (
        !isAbortError(error) &&
        (!controller.signal.aborted || error instanceof ForceLogoutError)
      ) {
        throw error;
      }
      return;
    } finally {
      if (abortController === controller) {
        abortController = null;
        onFinish?.();
      }
    }
  };

  const abort = (): void => {
    const controller = abortController;
    if (!controller) {
      return;
    }
    abortController = null;
    controller.abort();
    onFinish?.();
  };

  return {
    run,
    abort,
  };
}
