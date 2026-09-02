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

import {Access, type TieredItem} from '@/services/auth/types';
import {hasAccessTo} from '@/services/auth/utils';
import {useAppStore} from '@/stores/app-store';

export function useAccessTo(value: TieredItem | TieredItem[] | null | undefined): Access {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  // Only a paid item waits for auth; a free one is allowed right away.
  if (!value || (isAuthLoading && !hasAccessTo(null, value))) {
    return Access.Loading;
  }
  return hasAccessTo(user, value) ? Access.Allowed : Access.Denied;
}
