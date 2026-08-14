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

import {createLocalJWKSet, decodeJwt, type JWK, jwtVerify, type JWTVerifyGetKey} from 'jose';

import {APP_URL, AUTH_URL, PUBLIC_JWK} from '@/config';
import type {
  Authentication,
  AuthSession,
  AuthTokenResponse,
  Expirable,
} from '@/services/auth/types';
import type {CloudConnection} from '@/services/cloud/types';
import {
  deleteAuthSession,
  getAuthSession,
  saveAuthSession,
  saveAuthSessionIfUnchanged,
} from '@/services/db/auth-db';
import {saveCloudConnection} from '@/services/db/cloud-connection-db';
import {base64To256BitKey} from '@/utils/crypto';
import {fromEpochSeconds} from '@/utils/date';
import type {ErrorWithContextResponse} from '@/utils/error';
import {safeReadJson} from '@/utils/json';
import {withWebLock} from '@/utils/web-lock';

import {AuthError, AuthErrorType} from './errors';

export type LoginResult = [AuthSession, CloudConnection?];

const REDIRECT_URI = `${window.location.origin}/login/callback`;

export function withAuthLock<T>(callback: () => Promise<T>): Promise<T> {
  return withWebLock('artistassistapp:auth', callback);
}

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

export async function completeLogin(
  verifier: string,
  completionToken: string
): Promise<LoginResult> {
  return await withAuthLock(async (): Promise<LoginResult> => {
    const response = await fetch(new URL('/login/complete', AUTH_URL), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        verifier,
        completion_token: completionToken,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return await handleLoginResponse(response);
  });
}

async function handleLoginResponse(response: Response): Promise<LoginResult> {
  if (!response.ok) {
    const {error, error_context} = (await safeReadJson<ErrorWithContextResponse>(response)) ?? {};
    throw AuthError.fromErrorType(error, 'Login failed', error_context);
  }
  const {id_token, refresh_expires_at, cloud} = (await response.json()) as AuthTokenResponse;
  const session: AuthSession = {
    idToken: id_token,
    refreshExpiresAt: fromEpochSeconds(refresh_expires_at),
  };
  await saveAuthSession(session);
  let connection: CloudConnection | undefined;
  if (cloud) {
    const {id, provider} = cloud;
    connection = {
      id,
      provider,
    };
    await saveCloudConnection(connection);
  }
  return [session, connection];
}

export function isWithinRefreshWindow(
  {idTokenExpiresAt}: Authentication,
  windowMs: number
): boolean {
  return idTokenExpiresAt.getTime() - Date.now() <= windowMs;
}

// Returns null if another tab cleared the session while waiting for the lock.
export async function refreshSession(previous: AuthSession): Promise<AuthSession | null> {
  return await withAuthLock(async () => {
    const current = await getAuthSession();
    if (!current) {
      return null;
    }
    if (current.idToken !== previous.idToken) {
      // Another refresh or login replaced the session; use its result.
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
      const {error, error_context} = (await safeReadJson<ErrorWithContextResponse>(response)) ?? {};
      throw AuthError.fromErrorType(error, 'Could not refresh session', error_context);
    }
    const {id_token, refresh_expires_at} = (await response.json()) as AuthTokenResponse;
    if (decodeJwt(id_token).sub !== decodeJwt(current.idToken).sub) {
      throw new AuthError(AuthErrorType.Unauthorized, 'Refreshed session subject mismatch');
    }
    const refreshed: AuthSession = {
      idToken: id_token,
      refreshExpiresAt: fromEpochSeconds(refresh_expires_at),
    };
    return (await saveAuthSessionIfUnchanged(current.idToken, refreshed)) ?? null;
  });
}

export async function requestLogout(): Promise<void> {
  await withAuthLock(async () => {
    try {
      await fetch(new URL('/logout', AUTH_URL), {
        method: 'POST',
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      console.error('Logout failed', error);
    }
    await deleteAuthSession();
  });
}

export async function requestLoginEmailOtp(email: string): Promise<Expirable> {
  const url = new URL('/login/email/otp', AUTH_URL);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) {
    const {error, error_context} = (await safeReadJson<ErrorWithContextResponse>(response)) ?? {};
    throw AuthError.fromErrorType(error, 'Could not request login email OTP', error_context);
  }
  const {expires_at} = (await response.json()) as {
    expires_at: number;
  };
  return {
    expiresAt: fromEpochSeconds(expires_at),
  };
}

export async function verifyLoginEmailOtp(email: string, otp: string): Promise<LoginResult> {
  return await withAuthLock(async () => {
    const url = new URL('/login/email/otp/verify', AUTH_URL);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        otp,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return await handleLoginResponse(response);
  });
}

export function loginWithRedirect(challenge: string): void {
  const url = new URL('/login', AUTH_URL);
  const {searchParams} = url;
  searchParams.set('redirect_uri', REDIRECT_URI);
  searchParams.set('challenge', challenge);
  window.location.assign(url);
}

export async function deleteAccount(): Promise<void> {
  await withAuthLock(async () => {
    const url = new URL('/account', AUTH_URL);
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const {error, error_context} = (await safeReadJson<ErrorWithContextResponse>(response)) ?? {};
      throw AuthError.fromErrorType(error, 'Could not delete account data', error_context);
    }
  });
}
