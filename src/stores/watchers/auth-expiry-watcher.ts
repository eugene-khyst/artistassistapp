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

import {useAppStore} from '~/src/stores/app-store';

const VERIFICATION_INTERVAL = 5 * 60 * 1000;

let timeoutId: ReturnType<typeof setTimeout> | undefined;

function checkAuthExpiry(): void {
  const state = useAppStore.getState();
  if (!state.auth) {
    return;
  }
  if (state.isAuthExpired()) {
    window.location.reload();
    return;
  }
  schedule();
}

function schedule(): void {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(checkAuthExpiry, VERIFICATION_INTERVAL);
}

function stop(): void {
  clearTimeout(timeoutId);
  timeoutId = undefined;
}

// Reloads the app once the ID token has expired to prevent a stale session from remaining active.
// Runs only while authenticated. The store subscription activates/deactivates it.
export function initAuthExpiryWatcher(): void {
  useAppStore.subscribe(
    state => state.auth,
    auth => {
      if (auth) {
        if (timeoutId === undefined) {
          schedule();
        }
      } else {
        stop();
      }
    },
    {fireImmediately: true}
  );
}
