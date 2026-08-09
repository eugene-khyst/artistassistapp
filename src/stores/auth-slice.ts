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

import * as AuthClient from '@/services/auth/auth-client';
import {
  AuthError,
  AuthErrorType,
  AuthNoticeType,
  isJwtExpired,
  TERMINAL_AUTH_ERRORS,
} from '@/services/auth/errors';
import type {AuthAttempt, Authentication, AuthSession, Expirable} from '@/services/auth/types';
import * as CloudConnectionClient from '@/services/cloud/cloud-connection-client';
import {
  deleteAuthAttempt,
  getAuthAttempt,
  getAuthSession,
  saveAuthAttempt,
} from '@/services/db/auth-db';
import type {CloudSlice} from '@/stores/cloud-slice';
import {dedupeConcurrentCalls} from '@/utils/concurrency';
import {createSha256Base64Url, randomBase64Url} from '@/utils/crypto';
import {DisplayMode, getDisplayMode} from '@/utils/environment';

// How long before expiry to refresh the ID token.
export const AUTH_REFRESH_WINDOW_MS = 60 * 60 * 1000;

const LOGIN_EMAIL_OTP_RETRY_MS = 60 * 1000;
const AUTH_ATTEMPT_TIMEOUT_MS = 10 * 60 * 1000;

export interface AuthSlice {
  auth: Authentication | null;
  authAttempt: AuthAttempt | null;
  isAuthLoading: boolean;
  authError: AuthError | null;
  authNotice: AuthNoticeType | null;
  isLoginEmailOtpModalOpen: boolean;
  loginEmailOtp: Expirable | null;
  loginEmailOtpRetryAt: Date | null;
  isRequestLoginEmailOtpLoading: boolean;
  isVerifyLoginEmailOtpLoading: boolean;
  isAccountDeleting: boolean;

  handleLoginCallback: (completionToken: string | null) => Promise<void>;
  resolveAuth: (options?: {showLoading?: boolean}) => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: (error?: AuthErrorType) => Promise<void>;
  requestLoginEmailOtp: (email: string) => Promise<void>;
  verifyLoginEmailOtp: (email: string, otp: string) => Promise<AuthErrorType | null>;
  setLoginEmailOtpModalOpen: (open: boolean) => void;
  handleAuthError: (error: unknown, message: string) => Promise<void>;
  setAuthError: (authError?: AuthError | null) => void;
  clearAuthError: () => void;
  clearAuthNotice: () => void;
  reconcileAuthAttempt: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

let authAttemptTimeoutId: ReturnType<typeof setTimeout> | undefined;

function clearAuthAttemptTimeout(): void {
  clearTimeout(authAttemptTimeoutId);
  authAttemptTimeoutId = undefined;
}

type AuthSliceDependencies = Pick<CloudSlice, 'disconnectCloud'>;

export const createAuthSlice: StateCreator<AuthSlice & AuthSliceDependencies, [], [], AuthSlice> = (
  set,
  get
) => {
  const clearAuthAttempt = async (): Promise<void> => {
    await deleteAuthAttempt();
    clearAuthAttemptTimeout();
    set({
      authAttempt: null,
    });
  };

  return {
    auth: null,
    authAttempt: null,
    isAuthLoading: false,
    authError: null,
    authNotice: null,
    isLoginEmailOtpModalOpen: false,
    loginEmailOtp: null,
    loginEmailOtpRetryAt: null,
    isRequestLoginEmailOtpLoading: false,
    isVerifyLoginEmailOtpLoading: false,
    isAccountDeleting: false,

    handleLoginCallback: async (completionToken: string | null): Promise<void> => {
      set({
        isAuthLoading: true,
      });
      try {
        if (!completionToken) {
          throw new AuthError(AuthErrorType.LoginResultMissing, 'Login result missing');
        }
        const attempt = await getAuthAttempt();
        if (!attempt) {
          throw new AuthError(AuthErrorType.LoginResultMissing, 'Auth attempt not found');
        }
        await AuthClient.completeLogin(attempt.verifier, completionToken);
      } catch (error) {
        set({
          authError: AuthError.fromError(error, 'Login failed'),
        });
      } finally {
        set({
          isAuthLoading: false,
        });
      }
    },

    resolveAuth: dedupeConcurrentCalls(async ({showLoading} = {}): Promise<void> => {
      if (showLoading) {
        set({
          isAuthLoading: true,
        });
      }

      const reloadIfAuthenticated = (): void => {
        if (!get().auth) {
          return;
        }
        set({
          auth: null,
        });
        window.location.reload();
      };

      try {
        let session = await getAuthSession();
        while (session) {
          let auth: Authentication | null = null;
          try {
            auth = await AuthClient.verifyIdToken(session);
          } catch (error) {
            if (!isJwtExpired(error)) {
              const current = await getAuthSession();
              if (!current) {
                reloadIfAuthenticated();
                return;
              }
              if (current.idToken !== session.idToken) {
                session = current;
                continue;
              }
              await get().logout(AuthErrorType.InvalidToken);
              return;
            }
          }

          let authenticatedSession = session;
          if (!auth || AuthClient.isWithinRefreshWindow(auth, AUTH_REFRESH_WINDOW_MS)) {
            let refreshed: AuthSession | null | undefined;
            try {
              refreshed = await AuthClient.refreshSession(session);
            } catch (error) {
              const current = await getAuthSession();
              if (!current) {
                reloadIfAuthenticated();
                return;
              }
              if (current.idToken !== session.idToken) {
                session = current;
                continue;
              }

              const authError = AuthError.fromError(error);
              if (
                !auth ||
                auth.idTokenExpiresAt.getTime() <= Date.now() ||
                TERMINAL_AUTH_ERRORS.has(authError.type)
              ) {
                await get().logout(authError.type);
                return;
              }
            }

            if (refreshed === null) {
              reloadIfAuthenticated();
              return;
            }
            if (refreshed) {
              authenticatedSession = refreshed;
              try {
                auth = await AuthClient.verifyIdToken(refreshed);
              } catch {
                const current = await getAuthSession();
                if (!current) {
                  reloadIfAuthenticated();
                  return;
                }
                if (current.idToken !== refreshed.idToken) {
                  session = current;
                  continue;
                }
                await get().logout(AuthErrorType.InvalidToken);
                return;
              }
            }
          }

          const current = await getAuthSession();
          if (!current) {
            reloadIfAuthenticated();
            return;
          }
          if (current.idToken !== authenticatedSession.idToken) {
            session = current;
            continue;
          }
          set({
            auth: auth!,
          });
          return;
        }
        reloadIfAuthenticated();
      } finally {
        if (showLoading) {
          set({
            isAuthLoading: false,
          });
        }
      }
    }),

    loginWithRedirect: dedupeConcurrentCalls(async (): Promise<void> => {
      try {
        const verifier = randomBase64Url(32);
        const authAttempt: AuthAttempt = {
          pendingSince: Date.now(),
          displayMode: getDisplayMode(),
          verifier,
        };
        set({
          authError: null,
          authAttempt,
        });
        const challenge = await createSha256Base64Url(verifier);
        await saveAuthAttempt(authAttempt);
        AuthClient.loginWithRedirect(challenge);
      } catch (error) {
        await clearAuthAttempt();
        set({
          authError: AuthError.fromError(error, 'Login failed'),
        });
      }
    }),

    logout: dedupeConcurrentCalls(async (error?: AuthErrorType): Promise<void> => {
      set({
        auth: null,
        isAuthLoading: true,
      });
      try {
        await AuthClient.requestLogout();
        await CloudConnectionClient.clearCloudConnection();
        if (error) {
          const url = new URL('/logged-out', window.location.origin);
          url.searchParams.set('error', error);
          window.history.replaceState({}, '', url);
        }
        window.location.reload();
      } finally {
        set({
          isAuthLoading: false,
        });
      }
    }),

    requestLoginEmailOtp: dedupeConcurrentCalls(async (email: string): Promise<void> => {
      set({
        isRequestLoginEmailOtpLoading: true,
        loginEmailOtpRetryAt: new Date(Date.now() + LOGIN_EMAIL_OTP_RETRY_MS),
      });
      try {
        const loginEmailOtp = await AuthClient.requestLoginEmailOtp(email);
        set({
          loginEmailOtp,
        });
      } catch (error) {
        set({
          authError: AuthError.fromError(error, 'Could not request login code'),
        });
      } finally {
        set({
          isRequestLoginEmailOtpLoading: false,
        });
      }
    }),

    verifyLoginEmailOtp: dedupeConcurrentCalls(
      async (email: string, otp: string): Promise<AuthErrorType | null> => {
        set({
          isVerifyLoginEmailOtpLoading: true,
        });
        try {
          await AuthClient.verifyLoginEmailOtp(email, otp);
          window.location.reload();
          return null;
        } catch (error) {
          const authError = AuthError.fromError(error);
          const canRetryCurrentOtp =
            authError.type === AuthErrorType.InvalidLoginOtp ||
            authError.type === AuthErrorType.RateLimited;
          set({
            authError,
            ...(!canRetryCurrentOtp
              ? {
                  loginEmailOtp: null,
                  loginEmailOtpRetryAt: null,
                }
              : {}),
          });
          return authError.type;
        } finally {
          set({
            isVerifyLoginEmailOtpLoading: false,
          });
        }
      }
    ),

    setLoginEmailOtpModalOpen: (open: boolean): void => {
      set({
        isLoginEmailOtpModalOpen: open,
      });
    },

    setAuthError: (authError?: AuthError | null): void => {
      if (!authError) {
        return;
      }
      set({
        authError,
      });
    },

    handleAuthError: async (error: unknown, message: string): Promise<void> => {
      if (!error) {
        return;
      }
      const authError = AuthError.fromError(error, message);
      if (TERMINAL_AUTH_ERRORS.has(authError.type)) {
        await get().logout(authError.type);
        return;
      }
      set({
        authError,
      });
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

    reconcileAuthAttempt: async (): Promise<void> => {
      const session = await getAuthSession();
      const authAttempt = (await getAuthAttempt()) ?? null;
      set({
        authAttempt,
      });
      const {auth, authError} = get();
      if (session) {
        if (
          authAttempt &&
          auth &&
          authAttempt.displayMode !== DisplayMode.BROWSER &&
          getDisplayMode() === DisplayMode.BROWSER
        ) {
          set({
            authNotice: AuthNoticeType.LoginCompletedInBrowser,
          });
        }
        if (authAttempt) {
          await clearAuthAttempt();
        } else {
          clearAuthAttemptTimeout();
        }
        if (!auth) {
          window.location.reload();
        }
        return;
      }
      if (!authAttempt) {
        clearAuthAttemptTimeout();
        return;
      }
      if (auth || authError) {
        await clearAuthAttempt();
        return;
      }
      if (Date.now() - authAttempt.pendingSince >= AUTH_ATTEMPT_TIMEOUT_MS) {
        await clearAuthAttempt();
        set({
          authError: new AuthError(AuthErrorType.LoginResultMissing, 'Login result missing'),
        });
        return;
      }
      clearAuthAttemptTimeout();
      const remaining = authAttempt.pendingSince + AUTH_ATTEMPT_TIMEOUT_MS - Date.now();
      authAttemptTimeoutId = setTimeout(() => {
        authAttemptTimeoutId = undefined;
        void get().reconcileAuthAttempt();
      }, remaining);
    },

    deleteAccount: dedupeConcurrentCalls(async (): Promise<void> => {
      set({
        isAccountDeleting: true,
      });
      try {
        await get().disconnectCloud(true);
        try {
          await AuthClient.deleteAccount();
        } catch (error) {
          await get().handleAuthError(error, 'Could not delete account');
          return;
        }
        await get().logout();
      } finally {
        set({
          isAccountDeleting: false,
        });
      }
    }),
  };
};
