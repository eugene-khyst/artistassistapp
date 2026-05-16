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
import {AuthError, AuthErrorType} from '~/src/services/auth/types';
import {toAuthErrorType} from '~/src/services/auth/utils';
import {
  deleteIdToken,
  getAndDeleteAuthErrorData,
  getIdToken,
  saveIdToken,
} from '~/src/services/db/auth-db';
import {base64To256BitKey} from '~/src/utils/crypto';
import {replaceHistory} from '~/src/utils/history';
import {waitForServiceWorkerActivation} from '~/src/utils/service-worker';

const ERROR_KEY = 'error';
const ID_TOKEN_KEY = 'id_token';

interface AuthCallbackResult {
  idToken?: string | null;
  error?: string | null;
}

export interface AuthClientProps {
  domain: string;
  redirectUri: string;
  issuer: string;
  audience: string;
  jwk: string;
}

export function getMagicLink(jwt: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set(ID_TOKEN_KEY, jwt);
  return url.toString();
}

export class AuthClient {
  private authentication: Authentication | null = null;
  private jwks: jose.JWTVerifyGetKey | undefined;

  constructor(public props: AuthClientProps) {}

  // Built lazily so a malformed JWK fails as an auth error at first verify
  // rather than throwing at construction.
  private getJwks(): jose.JWTVerifyGetKey {
    if (!this.jwks) {
      try {
        this.jwks = jose.createLocalJWKSet({
          keys: [JSON.parse(this.props.jwk) as jose.JWK],
        });
      } catch {
        throw new AuthError(AuthErrorType.Unknown);
      }
    }
    return this.jwks;
  }

  private async authenticate(jwt: string): Promise<Authentication> {
    const {issuer, audience} = this.props;
    const {
      payload: {sub, exp, dek},
    } = await jose.jwtVerify(jwt, this.getJwks(), {issuer, audience});
    if (typeof sub !== 'string' || typeof exp !== 'number' || typeof dek !== 'string') {
      const message = 'ID token missing required claims';
      throw new AuthError(AuthErrorType.InvalidToken, message, {message});
    }
    return {
      user: {
        id: sub,
      },
      expiration: new Date(exp * 1000),
      dataEncryptionKey: base64To256BitKey(dek),
      magicLink: getMagicLink(jwt),
    };
  }

  async handleAuthCallback(): Promise<void> {
    const result = this.resolveAuthCallback();
    if (!result) {
      return;
    }
    const {idToken, error} = result;
    try {
      if (error) {
        const context = (await getAndDeleteAuthErrorData())?.context;
        throw new AuthError(toAuthErrorType(error), 'Authentication failed', context);
      }
      if (idToken) {
        try {
          this.authentication = await this.authenticate(idToken);
          await saveIdToken(idToken);
        } catch (error) {
          throw error instanceof AuthError ? error : createAuthError(error);
        }
      }
    } finally {
      replaceHistory();
    }
  }

  private resolveAuthCallback(): AuthCallbackResult | null {
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

  async loginWithRedirect(): Promise<void> {
    await waitForServiceWorkerActivation();
    const url = new URL(this.props.domain);
    url.pathname = '/authorize';
    url.searchParams.append('redirect_uri', this.props.redirectUri);
    window.location.assign(url.toString());
  }

  async logout(error?: AuthErrorType): Promise<void> {
    await deleteIdToken();
    if (error) {
      const url = new URL(window.location.href);
      url.searchParams.set('error', error);
      window.location.href = url.href;
    } else {
      window.location.reload();
    }
  }

  isAuthExpired(): boolean {
    const exp = this.authentication?.expiration;
    return !!exp && new Date() >= exp;
  }
}

function createAuthError(e: unknown): AuthError {
  const type: AuthErrorType =
    e instanceof jose.errors.JWTExpired ? AuthErrorType.Expired : AuthErrorType.InvalidToken;
  return new AuthError(type);
}
