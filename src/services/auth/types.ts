/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {User} from '@auth0/auth0-react';

export const MEMBERSHIP_CLAIM = 'https://artistassistapp.com/membership';

export interface Membership {
  active?: boolean;
  expiresAt?: string;
}

export interface AppUser extends User {
  [MEMBERSHIP_CLAIM]?: Membership;
}
