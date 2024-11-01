/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {User} from '~/src/services/auth';

export interface AuthContextInterface {
  user: User | null;
  loginWithRedirect: () => void;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}
