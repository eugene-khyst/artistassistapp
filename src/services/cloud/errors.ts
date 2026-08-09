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

import {AuthError, AuthErrorType} from '@/services/auth/errors';
import {ImageUnreadableError} from '@/services/image/errors';
import {toEnumValue} from '@/utils/enum';
import {getErrorMessage, isNetworkError} from '@/utils/error';

export enum CloudErrorType {
  ConnectionFailed = 'connection_failed',
  CloudConnectionNotFound = 'cloud_connection_not_found',
  AuthorizationFailed = 'authorization_failed',
  CloudAccessDenied = 'cloud_access_denied',
  OtherUserChanges = 'other_user_changes',
  SyncConflict = 'sync_conflict',
  NoSyncHistory = 'no_sync_history',
  CloudDataNotFound = 'cloud_data_not_found',
  CloudDataDeletionFailed = 'cloud_data_deletion_failed',
  CorruptedCloudData = 'corrupted_cloud_data',
  LocalImageUnreadable = 'local_image_unreadable',
  Network = 'network',
  RateLimited = 'rate_limited',
  Unknown = 'unknown',
}

export const SHARED_AUTH_ERRORS = [AuthErrorType.Unauthorized, AuthErrorType.Expired] as const;
export type SharedAuthErrors = (typeof SHARED_AUTH_ERRORS)[number];

export type ExtendedCloudErrorType = CloudErrorType | SharedAuthErrors;

export class CloudError extends Error {
  constructor(
    public readonly type: CloudErrorType,
    message: string,
    cause?: unknown
  ) {
    super(message, {cause});
    this.name = 'CloudError';
  }

  static fromError(
    error: unknown,
    message?: string,
    fallbackType: CloudErrorType = CloudErrorType.Unknown
  ): CloudError | AuthError {
    if (error instanceof CloudError) {
      return error;
    }
    if (error instanceof AuthError) {
      return error;
    }
    if (error instanceof ImageUnreadableError) {
      return new CloudError(CloudErrorType.LocalImageUnreadable, error.message, error);
    }
    message ??= getErrorMessage(error);
    return new CloudError(fallbackType, message, error);
  }

  static fromErrorType(
    error: string | null | undefined,
    message: string,
    fallbackType = CloudErrorType.Unknown
  ): CloudError | AuthError {
    const cloudErrorType = toEnumValue(CloudErrorType, error);
    if (cloudErrorType) {
      return new CloudError(cloudErrorType, message);
    }
    const authErrorType = toEnumValue(AuthErrorType, error);
    if (authErrorType) {
      return new AuthError(authErrorType, message);
    }
    return new CloudError(fallbackType, message);
  }

  static fromFetchError(error: unknown, message: string): CloudError {
    return new CloudError(
      isNetworkError(error) ? CloudErrorType.Network : CloudErrorType.Unknown,
      message,
      error
    );
  }
}
