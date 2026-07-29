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

import {AUTH_URL} from '@/config';
import {withCloudLock} from '@/services/cloud/cloud-lock';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import type {CloudAccessToken, CloudConnection, CloudProvider} from '@/services/cloud/types';
import {
  deleteCloudConnection,
  deleteCloudConnectionAndSync,
  saveCloudConnection,
} from '@/services/db/cloud-connection-db';
import type {StoreChangeTokens} from '@/services/db/types';
import {fromEpochSeconds} from '@/utils/date';
import type {ErrorResponse} from '@/utils/error';
import {safeReadJson} from '@/utils/json';

interface CloudConnectionResponse {
  id: string;
  provider: CloudProvider;
}

const REDIRECT_URI = `${window.location.origin}/cloud/callback`;
const ACCESS_TOKEN_EXPIRATION_BUFFER_MS = 5 * 60 * 1000;

let accessToken: CloudAccessToken | null = null;
let accessTokenRequest: Promise<CloudAccessToken> | null = null;

export async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not read cloud response');
  }
}

export function startCloudConnection(provider: CloudProvider, challenge: string): void {
  const url = new URL(`/cloud/${provider}/connect`, AUTH_URL);
  const {searchParams} = url;
  searchParams.set('redirect_uri', REDIRECT_URI);
  searchParams.set('challenge', challenge);
  window.location.assign(url);
}

export async function completeCloudConnection(verifier: string): Promise<CloudConnection> {
  return await withCloudLock(async (): Promise<CloudConnection> => {
    let response: Response;
    try {
      response = await fetch(new URL('/cloud/complete', AUTH_URL), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verifier,
        }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      throw CloudError.fromFetchError(error, 'Could not connect cloud storage');
    }
    if (!response.ok) {
      const {error} = (await safeReadJson<ErrorResponse>(response)) ?? {};
      throw CloudError.fromErrorType(error, 'Cloud connection failed');
    }
    const {id, provider} = await readJson<CloudConnectionResponse>(response);
    const cloudConnection = {
      id,
      provider,
    };
    clearCloudAccessToken();
    await saveCloudConnection(cloudConnection);
    return cloudConnection;
  });
}

export async function restoreCloudConnection(): Promise<CloudConnection> {
  return await withCloudLock(async () => {
    let response: Response;
    try {
      response = await fetch(new URL('/cloud/connection', AUTH_URL), {
        method: 'GET',
        credentials: 'include',
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      throw CloudError.fromFetchError(error, 'Could not get cloud connection');
    }
    if (!response.ok) {
      const {error} = (await safeReadJson<ErrorResponse>(response)) ?? {};
      const cloudError = CloudError.fromErrorType(error, 'Could not get cloud connection');
      if (cloudError.type === CloudErrorType.CloudConnectionNotFound) {
        await clearDisconnectedCloudConnection();
      }
      throw cloudError;
    }
    const {id, provider} = await readJson<CloudConnectionResponse>(response);
    const cloudConnection: CloudConnection = {
      id,
      provider,
    };
    clearCloudAccessToken();
    await saveCloudConnection(cloudConnection);
    return cloudConnection;
  });
}

export async function getCloudAccessToken(
  expectedProvider: CloudProvider
): Promise<CloudAccessToken> {
  if (
    accessToken?.provider === expectedProvider &&
    isAccessTokenFresh(accessToken, ACCESS_TOKEN_EXPIRATION_BUFFER_MS)
  ) {
    return accessToken;
  }

  accessTokenRequest ??= fetchCloudAccessToken();
  const request = accessTokenRequest;
  try {
    const token = await request;
    if (token.provider !== expectedProvider) {
      throw new CloudError(
        CloudErrorType.CloudConnectionNotFound,
        'Cloud access token belongs to a different provider'
      );
    }
    accessToken = token;
    return token;
  } finally {
    if (accessTokenRequest === request) {
      accessTokenRequest = null;
    }
  }
}

async function fetchCloudAccessToken(): Promise<CloudAccessToken> {
  let response: Response;
  try {
    response = await fetch(new URL('/cloud/access-token', AUTH_URL), {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not get cloud access token');
  }
  if (!response.ok) {
    const {error} = (await safeReadJson<ErrorResponse>(response)) ?? {};
    const cloudError = CloudError.fromErrorType(error, 'Could not get cloud access token');
    if (cloudError.type === CloudErrorType.CloudConnectionNotFound) {
      await clearDisconnectedCloudConnection();
    }
    throw cloudError;
  }
  const {provider, access_token, expires_at} = await readJson<{
    provider: CloudProvider;
    access_token: string;
    expires_at: number;
  }>(response);
  return {
    provider,
    accessToken: access_token,
    expiresAt: fromEpochSeconds(expires_at),
  };
}

export function clearCloudAccessToken(failedAccessToken?: string): void {
  if (!failedAccessToken || accessToken?.accessToken === failedAccessToken) {
    accessToken = null;
  }
}

async function clearDisconnectedCloudConnection(): Promise<StoreChangeTokens> {
  clearCloudAccessToken();
  return await deleteCloudConnectionAndSync();
}

export async function clearCloudConnection(): Promise<StoreChangeTokens> {
  return await withCloudLock(async () => {
    clearCloudAccessToken();
    return await deleteCloudConnection();
  });
}

export async function disconnectCloudConnection(): Promise<StoreChangeTokens> {
  let response: Response;
  try {
    response = await fetch(new URL('/cloud/disconnect', AUTH_URL), {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not disconnect cloud storage');
  }
  if (!response.ok) {
    const {error} = (await safeReadJson<ErrorResponse>(response)) ?? {};
    const cloudError = CloudError.fromErrorType(error, 'Could not disconnect cloud storage');
    if (cloudError.type !== CloudErrorType.CloudConnectionNotFound) {
      throw cloudError;
    }
  }
  return await clearDisconnectedCloudConnection();
}

function isAccessTokenFresh({expiresAt}: CloudAccessToken, expirationBufferMs: number): boolean {
  return expiresAt.getTime() - Date.now() > expirationBufferMs;
}
