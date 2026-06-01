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

import type {JWK, JWTVerifyGetKey} from 'jose';
import {createLocalJWKSet, jwtVerify} from 'jose';

import {APP_URL, AUTH_URL, PUBLIC_JWK} from '~/src/config';
import type {
  Authentication,
  AuthErrorData,
  AuthErrorResponse,
  AuthSession,
  AuthTokenResponse,
  LoginLink,
  LoginLinkResponse,
} from '~/src/services/auth/types';
import {AuthError, AuthErrorType} from '~/src/services/auth/types';
import {toAuthErrorType} from '~/src/services/auth/utils';
import {
  getAndDeleteAuthErrorData,
  getAuthSession,
  saveAuthSession,
} from '~/src/services/db/auth-db';
import {base64To256BitKey} from '~/src/utils/crypto';
import {fromEpochSeconds} from '~/src/utils/date';
import {replaceHistory} from '~/src/utils/history';
import {safeReadJson} from '~/src/utils/json';
import {withWebLock} from '~/src/utils/web-lock';

const REDIRECT_URI = `${window.location.origin}/login/callback`;
const AUTH_REFRESH_LOCK_NAME = 'artistassistapp:auth-refresh';
const ERROR_PARAM = 'error';

let jwks: JWTVerifyGetKey | undefined;

// Lazy so a malformed JWK surfaces as an auth error at first verify, not at module load.
function getJwks(): JWTVerifyGetKey {
  if (!jwks) {
    try {
      jwks = createLocalJWKSet({keys: [JSON.parse(PUBLIC_JWK) as JWK]});
    } catch (error) {
      throw AuthError.fromError(error);
    }
  }
  return jwks;
}

export async function verifyIdToken({
  idToken,
  refreshExpiresAt,
}: AuthSession): Promise<Authentication> {
  const {
    payload: {sub, exp, dek},
  } = await jwtVerify(idToken, getJwks(), {issuer: AUTH_URL, audience: APP_URL});
  if (typeof sub !== 'string' || typeof exp !== 'number' || typeof dek !== 'string') {
    throw new AuthError(AuthErrorType.InvalidToken, 'Invalid token');
  }
  return {
    user: {id: sub},
    idTokenExpiresAt: fromEpochSeconds(exp),
    refreshExpiresAt,
    dataEncryptionKey: base64To256BitKey(dek),
  };
}

export function isWithinRefreshWindow(auth: Authentication, windowMs: number): boolean {
  return auth.idTokenExpiresAt.getTime() - Date.now() <= windowMs;
}

// Returns null when another tab cleared the session while we waited for the lock;
// caller treats null as a silent cross-tab logout.
export async function refreshSession(previous: AuthSession): Promise<AuthSession | null> {
  return await withWebLock(AUTH_REFRESH_LOCK_NAME, async () => {
    const current = await getAuthSession();
    if (!current) {
      return null;
    }
    if (current.idToken !== previous.idToken) {
      // Another tab already refreshed; use its result.
      return current;
    }
    if (new Date() >= current.refreshExpiresAt) {
      throw new AuthError(AuthErrorType.Expired, 'Session expired');
    }
    const response = await fetch(new URL('/login/refresh', AUTH_URL), {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const {error, error_context} = (await safeReadJson<AuthErrorResponse>(response)) ?? {};
      throw new AuthError(toAuthErrorType(error), 'Could not refresh session', error_context);
    }
    const {id_token, refresh_expires_at} = (await response.json()) as AuthTokenResponse;
    const refreshed: AuthSession = {
      idToken: id_token,
      refreshExpiresAt: fromEpochSeconds(refresh_expires_at),
    };
    await saveAuthSession(refreshed);
    return refreshed;
  });
}

export async function requestLogout(): Promise<void> {
  await fetch(new URL('/logout', AUTH_URL), {
    method: 'POST',
    credentials: 'include',
    signal: AbortSignal.timeout(2000),
  });
}

export async function requestLoginLink(): Promise<LoginLink> {
  const url = new URL('/login-link', AUTH_URL);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    const {error, error_context} = (await safeReadJson<AuthErrorResponse>(response)) ?? {};
    throw new AuthError(toAuthErrorType(error), 'Could not create login link', error_context);
  }
  const {link, expires_at} = (await response.json()) as LoginLinkResponse;
  return {
    link: new URL(link),
    expiresAt: fromEpochSeconds(expires_at),
  };
}

export function loginWithRedirect(): void {
  const url = new URL('/authorize', AUTH_URL);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  window.location.assign(url);
}

export async function readAuthCallbackError(): Promise<AuthError | null> {
  const errorParam = new URL(window.location.href).searchParams.get(ERROR_PARAM);
  if (!errorParam) {
    return null;
  }
  let context: AuthErrorData['context'] | undefined;
  try {
    const data = await getAndDeleteAuthErrorData();
    context = data?.context;
  } catch (err) {
    console.error('Failed to read auth error context', err);
  } finally {
    replaceHistory();
  }
  return new AuthError(toAuthErrorType(errorParam), 'Login failed', context);
}
