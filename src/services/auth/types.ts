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

import type {DisplayMode} from '~/src/utils/environment';

export interface User {
  id: string;
}

export interface Authentication {
  user: User;
  expiration: Date;
  dataEncryptionKey: Uint8Array<ArrayBuffer>;
  magicLink: string;
}

export interface AuthAttempt {
  pendingSince: number;
  displayMode: DisplayMode;
}

export interface AuthErrorData {
  context?: Record<string, unknown>;
}

export enum AuthNoticeType {
  LoginCompletedInBrowser = 'login_completed_in_browser',
}

export enum AuthErrorType {
  Inactive = 'inactive',
  Expired = 'expired',
  InvalidToken = 'invalid_token',
  LoginResultMissing = 'login_result_missing',
  Unknown = 'unknown',
}

export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message?: string,
    public context?: Record<string, unknown> | null
  ) {
    super(message);
  }
}

export class ForceLogoutError extends Error {
  constructor(
    public reason: AuthErrorType = AuthErrorType.InvalidToken,
    message?: string
  ) {
    super(message);
  }
}
