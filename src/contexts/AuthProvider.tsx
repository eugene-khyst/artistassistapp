/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {type PropsWithChildren, useCallback, useEffect, useRef, useState} from 'react';

import {AuthContext} from '~/src/contexts/AuthContext';
import type {User} from '~/src/services/auth';
import {AuthError} from '~/src/services/auth';
import type {AuthClientProps} from '~/src/services/auth/auth-client';
import {AuthClient} from '~/src/services/auth/auth-client';

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
          setError(AUTH_ERROR_MESSAGES[error.type] || error.message);
        }
      }
      setIsLoading(false);
    })();
  }, [authClient]);

  const loginWithRedirect = useCallback(() => authClient.loginWithRedirect(), [authClient]);
  const logout = useCallback(() => authClient.logout(), [authClient]);

  return (
    <AuthContext.Provider value={{user, loginWithRedirect, logout, isLoading, error}}>
      {children}
    </AuthContext.Provider>
  );
};
