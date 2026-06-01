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

import {AuthErrorType} from '@/services/auth/types';
import {saveAuthErrorData, saveAuthSession} from '@/services/db/auth-db';
import {fromEpochSeconds} from '@/utils/date';

interface InjectedAuthCallback {
  idToken: string | null;
  refreshExpiresAt: number | null;
  error: string | null;
  errorContext: Record<string, unknown> | null;
}

// CF Pages Function fallback (iOS/iPadOS, no SW) injects the auth result as a
// `data-auth-callback` body attribute; persist it into the canonical SW shape
// (durable IDB + `?error=<type>` URL) so the rest of the app sees one shape.
export async function normalizeInjectedAuthCallback(): Promise<void> {
  const attribute = document.body.dataset['authCallback'];
  if (!attribute) {
    return;
  }
  delete document.body.dataset['authCallback'];
  document.body.removeAttribute('data-auth-callback');

  let data: InjectedAuthCallback | null;
  try {
    data = JSON.parse(attribute) as InjectedAuthCallback | null;
  } catch (e) {
    console.error('Malformed auth callback data', e);
    return;
  }
  if (!data) {
    return;
  }
  const {idToken, refreshExpiresAt, error, errorContext} = data;
  if (idToken && refreshExpiresAt) {
    await saveAuthSession({
      idToken,
      refreshExpiresAt: fromEpochSeconds(refreshExpiresAt),
    });
    window.history.replaceState({}, '', '/');
  } else {
    if (errorContext) {
      await saveAuthErrorData({context: errorContext});
    }
    const url = new URL(window.location.href);
    url.searchParams.set('error', error ?? AuthErrorType.LoginResultMissing);
    window.history.replaceState({}, '', url);
  }
}
