/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
import {replaceHistory} from '~/src/utils/history';

import jwks from './jwks.json';

const ID_TOKEN_KEY = 'id_token';

export function getMagicLink(jwt: string): string {
  const url = new URL(window.location.origin);
  url.searchParams.set(ID_TOKEN_KEY, jwt);
  return url.toString();
}

export interface AuthClientProps {
  domain: string;
  redirectUri: string;
  issuer: string;
  audience: string;
}

export class AuthClient {
  private authentication: Authentication | null = null;

  constructor(public props: AuthClientProps) {}

  private async authenticate(jwt: string): Promise<Authentication> {
    const JWKS = jose.createLocalJWKSet(jwks as jose.JSONWebKeySet);
    const {issuer, audience} = this.props;
    const {
      payload: {sub, exp},
    } = await jose.jwtVerify(jwt, JWKS, {issuer, audience});
    return {
      user: {
        id: sub!,
      },
      expiration: new Date(exp! * 1000),
      magicLink: getMagicLink(jwt),
    };
  }

  async handleRedirectCallback(): Promise<void> {
    const {searchParams} = new URL(window.location.toString());
    if (searchParams.has('error')) {
      const type = searchParams.get('error');
      const message = searchParams.get('error_description') ?? '';
      replaceHistory();
      throw new AuthError(type!, message);
    } else if (searchParams.has(ID_TOKEN_KEY)) {
      const jwt = searchParams.get(ID_TOKEN_KEY)!;
      try {
        this.authentication = await this.authenticate(jwt);
        localStorage.setItem(ID_TOKEN_KEY, jwt);
        replaceHistory();
      } catch (e) {
        throw authError(e);
      }
    }
  }

  async getAuthentication(): Promise<Authentication | null> {
    if (this.authentication) {
      return this.authentication;
    }
    const jwt: string | null = localStorage.getItem(ID_TOKEN_KEY);
    if (!jwt) {
      return null;
    }
    try {
      this.authentication = await this.authenticate(jwt);
      return this.authentication;
    } catch (e) {
      localStorage.removeItem(ID_TOKEN_KEY);
      throw authError(e);
    }
  }

  loginWithRedirect(): void {
    const url = new URL(this.props.domain);
    url.pathname = '/authorize';
    url.searchParams.append('redirect_uri', this.props.redirectUri);
    window.location.assign(url.toString());
  }

  logout(): void {
    localStorage.removeItem(ID_TOKEN_KEY);
    window.location.reload();
  }

  isAuthValid(): boolean {
    const exp = this.authentication?.expiration;
    return !exp || new Date() < exp;
  }
}

function authError(e: any): AuthError {
  const type: string = e instanceof jose.errors.JWTExpired ? 'expired' : 'invalid_token';
  return new AuthError(type);
}
