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

import {getIdToken} from '~/src/services/db/auth-db';
import {useAppStore} from '~/src/stores/app-store';

const TIMEOUT = 10 * 60 * 1000;
const POLL_INTERVAL = 1000;

let timeoutId: ReturnType<typeof setTimeout> | undefined;

async function pollAuthAttempt(): Promise<void> {
  const state = useAppStore.getState();
  const since: number | undefined = state.authAttempt?.pendingSince;
  if (since === undefined) {
    return;
  }
  if (state.auth) {
    await state.clearAuthAttempt();
    return;
  }
  if (await getIdToken()) {
    await state.clearAuthAttempt();
    window.location.reload();
    return;
  }
  if (Date.now() - since > TIMEOUT) {
    await state.failPendingAuthAttempt();
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
