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

import type {CloudProvider} from '@/services/cloud/types';
import type {DisplayMode} from '@/utils/environment';

export interface AuthTokenResponse {
  id_token: string;
  refresh_expires_at: number;
  cloud?: {
    id: string;
    provider: CloudProvider;
  };
}

export interface User {
  id: string;
}

export interface Authentication {
  user: User;
  idTokenExpiresAt: Date;
  refreshExpiresAt: Date;
  dataEncryptionKey: Uint8Array<ArrayBuffer>;
}

export interface AuthAttempt {
  pendingSince: number;
  displayMode: DisplayMode;
  verifier: string;
}

export interface AuthSession {
  idToken: string;
  refreshExpiresAt: Date;
}

export interface Expirable {
  expiresAt: Date;
}
