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

import {getAuthSession} from '@/services/db/auth-db';
import {useAppStore} from '@/stores/app-store';

const TIMEOUT = 10 * 60 * 1000;
const POLL_INTERVAL = 1000;

let timeoutId: ReturnType<typeof setTimeout> | undefined;

async function pollAuthAttempt(): Promise<void> {
  const {authAttempt, auth, completeAuthAttempt, clearAuthAttempt, failPendingAuthAttempt} =
    useAppStore.getState();
  const since: number | undefined = authAttempt?.pendingSince;
  if (since === undefined) {
    return;
  }
  if (auth) {
    await completeAuthAttempt();
    return;
  }
  if (await getAuthSession()) {
    // Clear before reload so a delayed or interrupted reload can't leave a
    // stale pending attempt behind.
    try {
      await clearAuthAttempt();
    } catch {
      // ignore
    }
    window.location.reload();
    return;
  }
  if (Date.now() - since > TIMEOUT) {
    await failPendingAuthAttempt();
    return;
  }
  schedule();
}

function schedule(): void {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => void pollAuthAttempt(), POLL_INTERVAL);
}

function stop(): void {
  clearTimeout(timeoutId);
  timeoutId = undefined;
}

// Fixes a PWA window stuck on a spinner when login finished in a different
// browser, by checking the saved IDB state once a second.
export function initAuthAttemptWatcher(): void {
  useAppStore.subscribe(
    state => state.authAttempt,
    authAttempt => {
      if (authAttempt) {
        if (timeoutId === undefined) {
          void pollAuthAttempt();
        }
      } else {
        stop();
      }
    },
    {fireImmediately: true}
  );
}
