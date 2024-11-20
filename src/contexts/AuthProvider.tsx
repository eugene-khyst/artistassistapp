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

import {type PropsWithChildren, useCallback, useEffect, useRef, useState} from 'react';

import {AuthContext} from '~/src/contexts/AuthContext';
import type {AuthClientProps, User} from '~/src/services/auth';
import {AuthClient, AuthError} from '~/src/services/auth';

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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isInitialized = useRef<boolean>(false);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;

    void (async () => {
      setIsLoading(true);
      try {
        await authClient.handleRedirectCallback();
        const user = await authClient.getUser();
        setUser(user);
      } catch (error) {
        console.log(error);
        if (error instanceof AuthError) {
          setError(AUTH_ERROR_MESSAGES[error.type] ?? error.message);
        }
      }
      setIsLoading(false);
    })();
  }, [authClient]);

  const loginWithRedirect = useCallback(() => {
    authClient.loginWithRedirect();
  }, [authClient]);
  const logout = useCallback(() => {
    authClient.logout();
  }, [authClient]);

  return (
    <AuthContext.Provider value={{user, loginWithRedirect, logout, isLoading, error}}>
      {children}
    </AuthContext.Provider>
  );
};
