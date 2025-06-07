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

import {type PropsWithChildren, useCallback, useEffect, useMemo, useState} from 'react';

import {AuthContext} from '~/src/contexts/AuthContext';
import type {AuthContextInterface} from '~/src/contexts/types';
import type {AuthClientProps} from '~/src/services/auth/auth-client';
import {AuthClient} from '~/src/services/auth/auth-client';
import type {Authentication} from '~/src/services/auth/types';
import {AuthError} from '~/src/services/auth/types';

const AUTH_VERIFICATION_INTERVAL = 5 * 60000;

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  inactive:
    'You have not yet joined ArtistAssistApp on Patreon as a paid member. Join and log in again.',
  expired: 'Your session has expired. Please log in again.',
  invalid_token: 'Failed to verify the ID token.',
};

type Props = PropsWithChildren<AuthClientProps>;

export const AuthProvider: React.FC<PropsWithChildren<Props>> = ({
  children,
  ...props
}: PropsWithChildren<Props>) => {
  const [authClient] = useState<AuthClient>(() => new AuthClient(props));
  const [auth, setAuth] = useState<Authentication>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setIsLoading(true);
    setError(undefined);

    const intervalId = setInterval(() => {
      if (!authClient.isAuthValid()) {
        window.location.reload();
      }
    }, AUTH_VERIFICATION_INTERVAL);

    void (async () => {
      try {
        await authClient.handleRedirectCallback();
        const auth = await authClient.getAuthentication();
        setAuth(auth);
      } catch (error) {
        console.log(error);
        if (error instanceof AuthError) {
          setError(AUTH_ERROR_MESSAGES[error.type] ?? error.message);
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      clearInterval(intervalId);
    };
  }, [authClient]);

  const loginWithRedirect = useCallback(() => {
    authClient.loginWithRedirect();
  }, [authClient]);

  const logout = useCallback(() => {
    authClient.logout();
  }, [authClient]);

  const authContext = useMemo<AuthContextInterface>(
    () => ({
      ...(auth ?? {}),
      loginWithRedirect,
      logout,
      isLoading,
      error,
    }),
    [auth, loginWithRedirect, logout, isLoading, error]
  );

  return <AuthContext.Provider value={authContext}>{children}</AuthContext.Provider>;
};
