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

import {toError} from '~/src/utils/error';
import {isAbortError} from '~/src/utils/promise';

const APP_INSTANCE_LOCK_NAME = 'artistassistapp:app-instance';

interface SingleInstanceCallbacks {
  onActiveInstance: () => Promise<void>;
  onConflict: () => Promise<void>;
}

let activateWaitingTab: (() => Promise<void>) | null = null;
// Non-null means this tab already has a queued-or-active promotion request for the app lock.
// The request is intentionally kept pending after promotion so the promoted tab continues holding
// the single-instance lock.
let queuedPromotionPromise: Promise<unknown> | null = null;
let queuedPromotionAbortController: AbortController | null = null;

export async function runSingleInstanceOrConflict({
  onActiveInstance,
  onConflict,
}: SingleInstanceCallbacks): Promise<void> {
  activateWaitingTab = onActiveInstance;

  const lockManager: LockManager | undefined = 'locks' in navigator ? navigator.locks : undefined;
  if (!lockManager) {
    await onActiveInstance();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const resolveOnce = (): void => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    const rejectOnce = (error: unknown): void => {
      const normalizedError = toError(error);
      if (!settled) {
        settled = true;
        reject(normalizedError);
      } else {
        console.error('Single-instance lock failed', normalizedError);
      }
    };

    void lockManager
      .request(APP_INSTANCE_LOCK_NAME, {ifAvailable: true}, async lock => {
        if (lock === null) {
          await onConflict();
          resolveOnce();
          return;
        }

        await onActiveInstance();
        resolveOnce();
        await new Promise<void>(() => undefined);
      })
      .catch(rejectOnce);
  });
}

export function waitForPrimaryTabToClose(): boolean {
  const lockManager: LockManager | undefined = 'locks' in navigator ? navigator.locks : undefined;
  const activateWaitingTabCallback = activateWaitingTab;
  if (!lockManager || !activateWaitingTabCallback) {
    return false;
  }

  if (queuedPromotionPromise) {
    return true;
  }

  const handleQueuedPromotionLock: LockGrantedCallback<Promise<undefined> | undefined> = lock => {
    if (lock === null) {
      return undefined;
    }

    return (async (): Promise<undefined> => {
      await activateWaitingTabCallback();
      await new Promise<void>(() => undefined);
      return undefined;
    })();
  };

  const abortController = new AbortController();
  const requestPromise = lockManager
    .request(APP_INSTANCE_LOCK_NAME, {signal: abortController.signal}, handleQueuedPromotionLock)
    .catch((error: unknown) => {
      if (queuedPromotionPromise === requestPromise) {
        queuedPromotionPromise = null;
      }
      if (queuedPromotionAbortController === abortController) {
        queuedPromotionAbortController = null;
      }
      if (!isAbortError(error)) {
        console.error('Waiting tab promotion failed', toError(error));
      }
    });
  queuedPromotionAbortController = abortController;
  queuedPromotionPromise = requestPromise;

  return true;
}

export function cancelWaitingForPrimaryTabToClose(): boolean {
  const abortController = queuedPromotionAbortController;
  if (!abortController) {
    return false;
  }

  queuedPromotionAbortController = null;
  queuedPromotionPromise = null;
  abortController.abort();
  return true;
}
