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

import {JWTExpired} from 'jose/errors';
import type {StateCreator} from 'zustand';

import {
  isWithinRefreshWindow,
  loginWithRedirect as initiateLoginRedirect,
  readAuthCallbackError,
  refreshSession,
  requestLoginLink,
  requestLogout,
  verifyIdToken,
} from '@/services/auth/auth-client';
import type {AuthAttempt, Authentication, LoginLink} from '@/services/auth/types';
import {
  AuthError,
  AuthErrorType,
  AuthNoticeType,
  TERMINAL_AUTH_ERRORS,
} from '@/services/auth/types';
import {
  deleteAuthAttemptIfPendingSince,
  deleteAuthSession,
  getAuthAttempt,
  getAuthSession,
  saveAuthAttempt,
} from '@/services/db/auth-db';
import type {AppSlice} from '@/stores/app-slice';
import {DisplayMode, getDisplayMode} from '@/utils/environment';

// How long before expiry to refresh the ID token.
export const AUTH_REFRESH_WINDOW_MS = 60 * 60 * 1000;

// Two logout calls at once share one run; the first caller's error type wins.
let logoutPromise: Promise<void> | null = null;

export interface AuthSlice {
  auth: Authentication | null;
  authAttempt: AuthAttempt | null;
  isAuthLoading: boolean;
  isLoginRedirecting: boolean;
  authError: AuthError | null;
  authNotice: AuthNoticeType | null;
  loginLink: LoginLink | null;

  resolveAuth: () => Promise<void>;
  handleAuthCallback: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: (error?: AuthErrorType) => Promise<void>;
  getLoginLink: () => Promise<LoginLink>;
  clearAuthError: () => void;
  clearAuthNotice: () => void;
  completeAuthAttempt: () => Promise<void>;
  loadAuthAttempt: () => Promise<AuthAttempt | null>;
  clearPendingAuthAttempt: (pendingSince: number) => Promise<boolean>;
  failPendingAuthAttempt: (pendingSince: number) => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice & AppSlice, [], [], AuthSlice> = (
  set,
  get
) => ({
  auth: null,
  authAttempt: null,
  isAuthLoading: false,
  isLoginRedirecting: false,
  authError: null,
  authNotice: null,
  loginLink: null,

  resolveAuth: async (): Promise<void> => {
    const session = await getAuthSession();
    const {auth: priorAuth} = get();
    if (!session) {
      if (priorAuth) {
        // Another tab logged out - reload to clear cached data from memory.
        await get().logout();
      }
      return;
    }
    // Refresh the session, then verify the new token. Returns null when another tab
    // cleared the session (logout already triggered); throws on refresh/verify failure.
    const refreshAndVerify = async (): Promise<Authentication | null> => {
      const refreshed = await refreshSession(session);
      if (refreshed === null) {
        await get().logout();
        return null;
      }
      return verifyIdToken(refreshed);
    };
    try {
      let auth = await verifyIdToken(session);
      if (isWithinRefreshWindow(auth, AUTH_REFRESH_WINDOW_MS)) {
        try {
          const refreshed = await refreshAndVerify();
          if (refreshed === null) {
            return;
          }
          auth = refreshed;
        } catch (err) {
          const authError = AuthError.fromError(err);
          if (TERMINAL_AUTH_ERRORS.has(authError.type)) {
            await get().logout(authError.type);
            return;
          }
          // Couldn't reach the server, but the token is still valid; keep using it.
        }
      }
      set({
        auth,
      });
    } catch (error) {
      if (error instanceof JWTExpired) {
        try {
          const auth = await refreshAndVerify();
          if (auth === null) {
            return;
          }
          set({
            auth,
          });
        } catch (refreshError) {
          // Token already strict-expired; any refresh failure is fatal.
          const authError = AuthError.fromError(refreshError);
          await get().logout(authError.type);
        }
      } else {
        await get().logout(AuthErrorType.InvalidToken);
      }
    }
  },

  handleAuthCallback: async (): Promise<void> => {
    const authError = await readAuthCallbackError();
    if (authError) {
      set({
        authError,
      });
    }
  },

  loginWithRedirect: async (): Promise<void> => {
    if (get().isLoginRedirecting) {
      return;
    }
    const attempt: AuthAttempt = {
      pendingSince: Date.now(),
      displayMode: getDisplayMode(),
    };
    set({
      authError: null,
      isLoginRedirecting: true,
    });
    try {
      await saveAuthAttempt(attempt);
      set({
        authAttempt: attempt,
        authError: null,
      });
      initiateLoginRedirect();
    } catch (error) {
      try {
        await get().clearPendingAuthAttempt(attempt.pendingSince);
      } catch {
        // ignore
      }
      set({
        authError: AuthError.fromError(error),
      });
    } finally {
      set({
        isLoginRedirecting: false,
      });
    }
  },

  logout: async (error?: AuthErrorType): Promise<void> => {
    if (logoutPromise) {
      return logoutPromise;
    }
    logoutPromise = (async () => {
      try {
        await requestLogout();
      } catch {
        // Offline or server down - local logout still proceeds.
      }
      try {
        await deleteAuthSession();
      } catch (deleteError) {
        console.error('Failed to delete auth session', deleteError);
      }
      if (error) {
        const url = new URL(window.location.href);
        url.searchParams.set('error', error);
        window.history.replaceState({}, '', url);
      }
      window.location.reload();
    })();
    return logoutPromise;
  },

  getLoginLink: async (): Promise<LoginLink> => {
    const {loginLink} = get();
    if (loginLink && new Date() < loginLink.expiresAt) {
      return loginLink;
    }
    try {
      const newLoginLink = await requestLoginLink();
      set({
        loginLink: newLoginLink,
      });
      return newLoginLink;
    } catch (error) {
      const authError = AuthError.fromError(error);
      if (TERMINAL_AUTH_ERRORS.has(authError.type)) {
        void get().logout(authError.type);
      } else {
        set({
          authError,
        });
      }
      throw authError;
    }
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

  completeAuthAttempt: async (): Promise<void> => {
    const authAttempt = await get().loadAuthAttempt();
    const {auth, authError} = get();
    if (authAttempt && (auth || authError)) {
      if (
        auth &&
        authAttempt.displayMode !== DisplayMode.BROWSER &&
        getDisplayMode() === DisplayMode.BROWSER
      ) {
        set({
          authNotice: AuthNoticeType.LoginCompletedInBrowser,
        });
      }
      await get().clearPendingAuthAttempt(authAttempt.pendingSince);
    }
  },

  loadAuthAttempt: async (): Promise<AuthAttempt | null> => {
    const authAttempt = (await getAuthAttempt()) ?? null;
    set({
      authAttempt,
    });
    return authAttempt;
  },

  clearPendingAuthAttempt: async (pendingSince: number): Promise<boolean> => {
    const cleared = await deleteAuthAttemptIfPendingSince(pendingSince);
    const storedAuthAttempt = (await getAuthAttempt()) ?? null;
    set(state => {
      const localAuthAttempt = state.authAttempt;
      if (localAuthAttempt?.pendingSince !== pendingSince) {
        return {};
      }
      return {
        authAttempt: storedAuthAttempt,
      };
    });
    return cleared;
  },

  failPendingAuthAttempt: async (pendingSince: number): Promise<void> => {
    const cleared = await get().clearPendingAuthAttempt(pendingSince);
    if (!cleared) {
      return;
    }
    set(state => {
      if (state.authAttempt) {
        return {};
      }
      if (state.isLoginRedirecting) {
        return {};
      }
      return {
        authError: new AuthError(AuthErrorType.LoginResultMissing, 'Login result missing'),
      };
    });
  },
});
