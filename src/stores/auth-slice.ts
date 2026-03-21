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

import type {StateCreator} from 'zustand';

import {APP_URL, AUTH_URL} from '~/src/config';
import {AuthClient} from '~/src/services/auth/auth-client';
import {type Authentication, AuthError} from '~/src/services/auth/types';

const AUTH_VERIFICATION_INTERVAL = 5 * 60000;

export interface AuthSlice {
  authClient: AuthClient;
  auth: Authentication | null;
  isAuthLoading: boolean;
  authError: AuthError | null;
  authCheckInterval: number | null;

  handleAuthCallback: () => Promise<Authentication | null>;
  loginWithRedirect: () => void;
  logout: () => Promise<void>;
  isAuthValid: () => boolean;
  clearAuthError: () => void;
  startPeriodicAuthVerification: () => void;
  stopPeriodicAuthVerification: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (set, get) => ({
  authClient: new AuthClient({
    domain: AUTH_URL,
    redirectUri: `${window.location.origin}/login/callback`,
    issuer: AUTH_URL,
    audience: APP_URL,
  }),
  auth: null,
  isAuthLoading: false,
  authError: null,
  authCheckInterval: null,

  handleAuthCallback: async (): Promise<Authentication | null> => {
    set({
      isAuthLoading: true,
      authError: null,
    });
    const {authClient} = get();
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
    get().authClient.loginWithRedirect();
  },
  logout: async (): Promise<void> => {
    get().stopPeriodicAuthVerification();
    await get().authClient.logout();
  },
  isAuthValid: (): boolean => {
    return get().authClient.isAuthValid();
  },
  clearAuthError: (): void => {
    set({
      authError: null,
    });
  },
  startPeriodicAuthVerification: () => {
    const authCheckInterval = window.setInterval(() => {
      if (!get().isAuthValid()) {
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
