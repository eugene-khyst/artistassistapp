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

import type {Authentication, User} from '~/src/services/auth/types';
import {AuthErrorType, ForceLogoutError} from '~/src/services/auth/types';
import {decrypt, isEncrypted} from '~/src/utils/crypto';

export interface TieredResource {
  freeTier?: boolean;
}

export function hasAccessTo(
  user: User | null | undefined,
  value: TieredResource | TieredResource[] | null | undefined
): boolean {
  return !value || ![value].flat().some(({freeTier}) => !freeTier) || !!user;
}

export async function decryptDataIfNeeded<T>(
  data: unknown,
  auth: Authentication | null
): Promise<T | undefined> {
  if (isEncrypted(data)) {
    if (auth) {
      try {
        const decrypted: string = await decrypt(data, auth.dataEncryptionKey);
        return JSON.parse(decrypted) as T;
      } catch {
        throw new ForceLogoutError(AuthErrorType.InvalidToken, 'Invalid token');
      }
    } else {
      return;
    }
  } else {
    return data as T;
  }
}

export function toAuthErrorType(value: string | null | undefined): AuthErrorType {
  return Object.values(AuthErrorType).includes(value as AuthErrorType)
    ? (value as AuthErrorType)
    : AuthErrorType.Unknown;
}
