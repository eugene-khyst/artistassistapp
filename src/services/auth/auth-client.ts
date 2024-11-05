/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import type {User} from '~/src/services/auth/types';
import {AuthError} from '~/src/services/auth/types';
import {replaceHistory} from '~/src/services/url';

import jwks from './jwks.json';

const ID_TOKEN_KEY = 'id_token';

export interface AuthClientProps {
  domain: string;
  redirectUri: string;
  issuer: string;
  audience: string;
}

export class AuthClient {
  private user: User | null = null;

  constructor(public props: AuthClientProps) {}

  private async verifyJwt(jwt: string): Promise<User> {
    const JWKS = jose.createLocalJWKSet(jwks as jose.JSONWebKeySet);
    const {issuer, audience} = this.props;
    const {
      payload: {sub, name},
    } = await jose.jwtVerify(jwt, JWKS, {issuer, audience});
    return {
      id: sub!,
      name: name as string,
    };
  }

  async handleRedirectCallback(): Promise<void> {
    const {searchParams} = new URL(window.location.toString());
    if (searchParams.has('error')) {
      const type = searchParams.get('error');
      const message = searchParams.get('error_description') ?? '';
      replaceHistory();
      throw new AuthError(type!, message);
    } else if (searchParams.has('id_token')) {
      const jwt = searchParams.get('id_token')!;
      replaceHistory();
      try {
        this.user = await this.verifyJwt(jwt);
        localStorage.setItem(ID_TOKEN_KEY, jwt);
      } catch (e) {
        rethrowAuthError(e);
      }
    }
  }

  async getUser(): Promise<User | null> {
    if (this.user) {
      return this.user;
    }
    const jwt: string | null = localStorage.getItem(ID_TOKEN_KEY);
    if (!jwt) {
      return null;
    }
    try {
      this.user = await this.verifyJwt(jwt);
    } catch (e) {
      localStorage.removeItem(ID_TOKEN_KEY);
      rethrowAuthError(e);
    }
    return this.user;
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
}

function rethrowAuthError(e: any): void {
  if (e instanceof jose.errors.JWTExpired) {
    throw new AuthError('expired');
  } else {
    throw new AuthError('invalid_token');
  }
}
