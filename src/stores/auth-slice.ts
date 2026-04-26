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
import type {StateCreator} from 'zustand';

import {APP_URL, AUTH_URL, PUBLIC_JWK} from '~/src/config';
import {AuthClient} from '~/src/services/auth/auth-client';
import {type Authentication, AuthError} from '~/src/services/auth/types';

const AUTH_VERIFICATION_INTERVAL = 5 * 60000;

export interface AuthSlice {
  authClient: AuthClient | null;
  auth: Authentication | null;
  isAuthLoading: boolean;
  authError: AuthError | null;
  authCheckInterval: number | null;

  initAuthClient: () => void;
  handleAuthCallback: () => Promise<Authentication | null>;
  loginWithRedirect: () => void;
  logout: () => Promise<void>;
  isAuthExpired: () => boolean;
  clearAuthError: () => void;
  startPeriodicAuthVerification: () => void;
  stopPeriodicAuthVerification: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set, get) => ({
  authClient: null,
  auth: null,
  isAuthLoading: false,
  authError: null,
  authCheckInterval: null,

  initAuthClient: (): void => {
    if (get().authClient) {
      return;
    }
    set({
      authClient: new AuthClient({
        domain: AUTH_URL,
        redirectUri: `${window.location.origin}/login/callback`,
        issuer: AUTH_URL,
        audience: APP_URL,
        jwks: jose.createLocalJWKSet({
          keys: [JSON.parse(PUBLIC_JWK) as jose.JWK],
        }),
      }),
    });
  },
  handleAuthCallback: async (): Promise<Authentication | null> => {
    const {authClient} = get();
    if (!authClient) {
      return null;
    }
    set({
      isAuthLoading: true,
      authError: null,
    });
    try {
      await authClient.handleAuthCallback();
      const auth: Authentication | null = await authClient.getAuthentication();
      set({
        auth,
      });
      return auth;
    } catch (error) {
      console.log(error);
      if (error instanceof AuthError) {
        set({
          authError: error,
        });
      }
      return null;
    } finally {
      set({
        isAuthLoading: false,
      });
    }
  },
  loginWithRedirect: (): void => {
    get().authClient?.loginWithRedirect();
  },
  logout: async (): Promise<void> => {
    get().stopPeriodicAuthVerification();
    await get().authClient?.logout();
  },
  isAuthExpired: (): boolean => {
    return get().authClient?.isAuthExpired() ?? false;
  },
  clearAuthError: (): void => {
    set({
      authError: null,
    });
  },
  startPeriodicAuthVerification: () => {
    const authCheckInterval = window.setInterval(() => {
      if (get().isAuthExpired()) {
        window.location.reload();
      }
    }, AUTH_VERIFICATION_INTERVAL);
    set({
      authCheckInterval,
    });
  },
  stopPeriodicAuthVerification: () => {
    const {authCheckInterval} = get();
    if (authCheckInterval !== null) {
      clearInterval(authCheckInterval);
      set({
        authCheckInterval: null,
      });
    }
  },
});
