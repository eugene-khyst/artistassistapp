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

import type {DisplayMode} from '@/utils/environment';
import {getErrorMessage} from '@/utils/error';

export interface AuthTokenResponse {
  id_token: string;
  refresh_expires_at: number;
}

export interface AuthErrorResponse {
  error?: string;
  error_context?: Record<string, unknown>;
}

export interface ExpirableResponse {
  expires_at: number;
}

export interface LoginLinkResponse extends ExpirableResponse {
  link: string;
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
}

export interface AuthErrorData {
  context?: Record<string, unknown>;
}

export interface AuthSession {
  idToken: string;
  refreshExpiresAt: Date;
}

export interface Expirable {
  expiresAt: Date;
}

export interface LoginLink extends Expirable {
  link: URL;
}

export enum AuthNoticeType {
  LoginCompletedInBrowser = 'login_completed_in_browser',
}

export enum AuthErrorType {
  Unauthorized = 'unauthorized',
  MemberNotFound = 'member_not_found',
  Inactive = 'inactive',
  Expired = 'expired',
  InvalidToken = 'invalid_token',
  InvalidLoginLink = 'invalid_login_link',
  InvalidLoginOtp = 'invalid_login_otp',
  LoginOtpMaxAttemptsExceeded = 'login_otp_attempts_exceeded',
  LoginResultMissing = 'login_result_missing',
  RateLimited = 'rate_limited',
  Unknown = 'unknown',
}

// Errors that mean the credential is rejected.
export const TERMINAL_AUTH_ERRORS: ReadonlySet<AuthErrorType> = new Set([
  AuthErrorType.Unauthorized,
  AuthErrorType.MemberNotFound,
  AuthErrorType.Inactive,
  AuthErrorType.InvalidToken,
  AuthErrorType.Expired,
]);

export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public context: Record<string, unknown> = {},
    cause?: unknown
  ) {
    super(message, {cause});
    this.name = 'AuthError';
  }

  static fromError(
    error: unknown,
    message?: string,
    fallbackType: AuthErrorType = AuthErrorType.Unknown
  ): AuthError {
    if (error instanceof AuthError) {
      return error;
    }
    if (error instanceof JWTExpired) {
      return new AuthError(AuthErrorType.Expired, message ?? 'Session expired', {}, error);
    }
    message ??= getErrorMessage(error);
    return new AuthError(fallbackType, message, {}, error);
  }
}

export class ForceLogoutError extends Error {
  constructor(
    public type: AuthErrorType,
    message?: string
  ) {
    super(message);
    this.name = 'ForceLogoutError';
  }
}
