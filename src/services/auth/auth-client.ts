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

import * as jose from 'jose';

import type {Authentication} from '~/src/services/auth/types';
import {AuthError} from '~/src/services/auth/types';
import {
  deleteIdToken,
  getAndDeleteAuthErrorData,
  getIdToken,
  saveIdToken,
} from '~/src/services/db/auth-db';
import {replaceHistory} from '~/src/utils/history';

const ERROR_KEY = 'error';
const ID_TOKEN_KEY = 'id_token';

interface AuthCallbackResult {
  idToken?: string | null;
  error?: string | null;
  errorContext?: Record<string, unknown> | null;
}

export interface AuthClientProps {
  domain: string;
  redirectUri: string;
  issuer: string;
  audience: string;
  jwks: jose.JWTVerifyGetKey;
}

export function getMagicLink(jwt: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set(ID_TOKEN_KEY, jwt);
  return url.toString();
}

export class AuthClient {
  private authentication: Authentication | null = null;

  constructor(public props: AuthClientProps) {}

  private async authenticate(jwt: string): Promise<Authentication> {
    const {issuer, audience, jwks} = this.props;
    const {
      payload: {sub, exp},
    } = await jose.jwtVerify(jwt, jwks, {issuer, audience});
    return {
      user: {
        id: sub!,
      },
      expiration: new Date(exp! * 1000),
      magicLink: getMagicLink(jwt),
    };
  }

  async handleAuthCallback(): Promise<void> {
    const result = this.resolveAuthCallback();
    if (!result) {
      return;
    }

    const {idToken, error, errorContext} = result;
    try {
      if (error) {
        const context = errorContext ?? (await getAndDeleteAuthErrorData())?.context;
        throw new AuthError(error, 'Authentication failed', context);
      }
      if (idToken) {
        try {
          this.authentication = await this.authenticate(idToken);
          await saveIdToken(idToken);
        } catch (e) {
          throw createAuthError(e);
        }
      }
    } finally {
      replaceHistory();
    }
  }

  private resolveAuthCallback(): AuthCallbackResult | null {
    // Cloudflare Pages Function injected data (iOS fallback)
    const callbackDataAttribute = document.body.dataset['authCallback'];
    if (callbackDataAttribute) {
      try {
        const callbackData = JSON.parse(callbackDataAttribute) as AuthCallbackResult | null;
        if (callbackData) {
          return callbackData;
        }
      } catch (e) {
        console.error('Malformed auth callback data', e);
      }
    }

    // URL params (Service Worker redirect)
    const {searchParams} = new URL(window.location.toString());
    const error = searchParams.get(ERROR_KEY);
    const idToken = searchParams.get(ID_TOKEN_KEY);
    if (!error && !idToken) {
      return null;
    }

    return {idToken, error};
  }

  async getAuthentication(): Promise<Authentication | null> {
    if (this.authentication) {
      return this.authentication;
    }
    const jwt: string | undefined = await getIdToken();
    if (!jwt) {
      return null;
    }
    try {
      this.authentication = await this.authenticate(jwt);
      return this.authentication;
    } catch (e) {
      await deleteIdToken();
      throw createAuthError(e);
    }
  }

  loginWithRedirect(): void {
    const url = new URL(this.props.domain);
    url.pathname = '/authorize';
    url.searchParams.append('redirect_uri', this.props.redirectUri);
    window.location.assign(url.toString());
  }

  async logout(): Promise<void> {
    await deleteIdToken();
    window.location.reload();
  }

  isAuthExpired(): boolean {
    const exp = this.authentication?.expiration;
    return !!exp && new Date() >= exp;
  }
}

function createAuthError(e: unknown): AuthError {
  const type: string = e instanceof jose.errors.JWTExpired ? 'expired' : 'invalid_token';
  return new AuthError(type);
}
