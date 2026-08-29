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

import {
  byBoolean,
  byNumber,
  type Comparator,
  compare,
  reverseOrder,
} from '@eugene-khyst/artistassistapp-color-mixer';

import {type User} from '@/services/auth/types';
import {type TieredResource} from '@/services/auth/utils';

export interface CatalogItem extends TieredResource {
  id: string;
  priority?: number;
}

export const compareByPriority: Comparator<CatalogItem> = reverseOrder(
  byNumber(({priority}) => priority)
);

export const compareByFreeTierAndPriority: Comparator<CatalogItem> = compare(
  reverseOrder(byBoolean(({freeTier}) => freeTier)),
  reverseOrder(byNumber(({priority}) => priority))
);

export function getDefaultItem<T extends CatalogItem>(
  items?: Map<string, T>,
  user?: User,
  predicate: (item: T) => boolean = () => true
): T | undefined {
  if (!items) {
    return;
  }
  const [item] = [...items.values()]
    .filter(predicate)
    .sort(user ? compareByPriority : compareByFreeTierAndPriority);
  return item;
}
