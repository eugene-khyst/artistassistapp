/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {createContext} from 'react';

import type {AuthContextInterface} from '~/src/contexts/types';

const stub = (): void => {};

const initialContext: AuthContextInterface = {
  user: null,
  loginWithRedirect: stub,
  logout: stub,
  isLoading: false,
  error: null,
};

export const AuthContext = createContext<AuthContextInterface>(initialContext);
