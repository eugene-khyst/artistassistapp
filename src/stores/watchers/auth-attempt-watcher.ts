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

import {useAppStore} from '@/stores/app-store';

let initialized = false;

function runSyncWhenVisible(): void {
  if (document.visibilityState !== 'hidden') {
    const {auth, authAttempt} = useAppStore.getState();
    if (auth && !authAttempt) {
      return;
    }
    void useAppStore.getState().reconcileAuthAttempt();
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
}
