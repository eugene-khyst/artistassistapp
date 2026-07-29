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

import {toEnumValue} from '@/utils/enum';
import {getErrorMessage} from '@/utils/error';

export enum AuthNoticeType {
  LoginCompletedInBrowser = 'login_completed_in_browser',
}

export enum AuthErrorType {
  Unauthorized = 'unauthorized',
  MemberNotFound = 'member_not_found',
  Inactive = 'inactive',
  Expired = 'expired',
  InvalidToken = 'invalid_token',
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
    public readonly type: AuthErrorType,
    message: string,
    public readonly context: Record<string, unknown> = {},
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
    if (isJwtExpired(error)) {
      return new AuthError(AuthErrorType.Expired, message ?? 'Session expired', {}, error);
    }
    message ??= getErrorMessage(error);
    return new AuthError(fallbackType, message, {}, error);
  }

  static fromErrorType(
    error: string | null | undefined,
    message: string,
    context: Record<string, unknown> = {},
    fallbackType = AuthErrorType.Unknown
  ): AuthError {
    const authErrorType = toEnumValue(AuthErrorType, error);
    if (authErrorType) {
      return new AuthError(authErrorType, message, context);
    }
    return new AuthError(fallbackType, message, context);
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

export function isJwtExpired(error: unknown): boolean {
  return (error as {code?: unknown} | null)?.code === 'ERR_JWT_EXPIRED';
}
