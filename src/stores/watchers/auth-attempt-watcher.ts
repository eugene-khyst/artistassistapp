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

let initialized = false;

async function syncAuthAttempt(): Promise<void> {
  const {auth, clearPendingAuthAttempt, failPendingAuthAttempt, loadAuthAttempt} =
    useAppStore.getState();
  const session = await getAuthSession();
  const authAttempt = await loadAuthAttempt();
  if (session) {
    try {
      if (authAttempt) {
        await clearPendingAuthAttempt(authAttempt.pendingSince);
      }
    } catch {
      // ignore
    }
    if (!auth) {
      window.location.reload();
    }
    return;
  }
  if (authAttempt && Date.now() - authAttempt.pendingSince > TIMEOUT) {
    await failPendingAuthAttempt(authAttempt.pendingSince);
  }
}

function runSyncWhenVisible(): void {
  if (document.visibilityState !== 'hidden') {
    const {auth, authAttempt} = useAppStore.getState();
    if (auth && !authAttempt) {
      return;
    }
    void syncAuthAttempt();
  }
}

// Fixes a PWA window stuck on a stale auth state when login finishes in
// another browser while this window is sleeping.
export function initAuthAttemptWatcher(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  document.addEventListener('visibilitychange', runSyncWhenVisible);
  window.addEventListener('pageshow', runSyncWhenVisible);
  runSyncWhenVisible();
}
