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

import {APP_URL, AUTH_URL, PUBLIC_JWK} from '~/src/config';
import {AuthClient} from '~/src/services/auth/auth-client';
import type {AuthAttempt, Authentication, AuthNoticeType} from '~/src/services/auth/types';
import {AuthError, AuthErrorType} from '~/src/services/auth/types';
import {deleteAuthAttempt, getAuthAttempt, saveAuthAttempt} from '~/src/services/db/auth-db';
import type {AppSlice} from '~/src/stores/app-slice';
import {getDisplayMode} from '~/src/utils/environment';

const authClient = new AuthClient({
  domain: AUTH_URL,
  redirectUri: `${window.location.origin}/login/callback`,
  issuer: AUTH_URL,
  audience: APP_URL,
  jwk: PUBLIC_JWK,
});

export interface AuthSlice {
  auth: Authentication | null;
  authAttempt: AuthAttempt | null;
  isAuthLoading: boolean;
  authError: AuthError | null;
  authNotice: AuthNoticeType | null;
  isLoggingOut: boolean;

  handleAuthCallback: () => Promise<Authentication | null>;
  loginWithRedirect: () => Promise<void>;
  logout: (error?: AuthErrorType) => Promise<void>;
  isAuthExpired: () => boolean;
  clearAuthError: () => void;
  clearAuthNotice: () => void;
  loadAuthAttempt: () => Promise<void>;
  clearAuthAttempt: () => Promise<void>;
  failPendingAuthAttempt: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice & AppSlice, [], [], AuthSlice> = (
  set,
  get
) => ({
  auth: null,
  authAttempt: null,
  isAuthLoading: false,
  authError: null,
  authNotice: null,
  isLoggingOut: false,

  handleAuthCallback: async (): Promise<Authentication | null> => {
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
  loginWithRedirect: async (): Promise<void> => {
    const {authAttempt} = get();
    if (authAttempt) {
      return;
    }
    const attempt: AuthAttempt = {
      pendingSince: Date.now(),
      displayMode: getDisplayMode(),
    };
    set({
      authAttempt: attempt,
      authError: null,
    });
    try {
      await saveAuthAttempt(attempt);
      await authClient.loginWithRedirect();
    } catch (error) {
      console.error(error);
      await deleteAuthAttempt().catch(() => undefined);
      set({
        authAttempt: null,
        authError: new AuthError(AuthErrorType.Unknown),
      });
    }
  },
  logout: async (error?: AuthErrorType): Promise<void> => {
    const {isLoggingOut} = get();
    if (isLoggingOut) {
      return;
    }
    set({isLoggingOut: true});
    await authClient.logout(error);
  },
  isAuthExpired: (): boolean => {
    return authClient.isAuthExpired();
  },
  clearAuthError: (): void => {
    set({
      authError: null,
    });
  },
  clearAuthNotice: (): void => {
    set({
      authNotice: null,
    });
  },
  loadAuthAttempt: async (): Promise<void> => {
    set({
      authAttempt: (await getAuthAttempt()) ?? null,
    });
  },
  clearAuthAttempt: async (): Promise<void> => {
    await deleteAuthAttempt();
    set({
      authAttempt: null,
    });
  },
  failPendingAuthAttempt: async (): Promise<void> => {
    set({
      authError: new AuthError(AuthErrorType.LoginResultMissing),
    });
    await get().clearAuthAttempt();
  },
});
