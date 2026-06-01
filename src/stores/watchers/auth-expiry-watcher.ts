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

const POLL_INTERVAL = 60 * 1000;

let timeoutId: ReturnType<typeof setTimeout> | undefined;

async function pollAuthExpiry(): Promise<void> {
  const dbSession = await getAuthSession();
  const {logout, resolveAuth} = useAppStore.getState();
  if (!dbSession) {
    // Another tab logged out; reload silently.
    void logout();
    return;
  }
  await resolveAuth();
  // Skip scheduling if resolveAuth triggered a logout — page is reloading.
  if (useAppStore.getState().auth) {
    schedule();
  }
}

function schedule(): void {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => void pollAuthExpiry(), POLL_INTERVAL);
}

function stop(): void {
  clearTimeout(timeoutId);
  timeoutId = undefined;
}

export function initAuthExpiryWatcher(): void {
  useAppStore.subscribe(
    state => state.auth,
    auth => {
      if (auth && timeoutId === undefined) {
        schedule();
      } else if (!auth) {
        stop();
      }
    },
    {fireImmediately: true}
  );
}
