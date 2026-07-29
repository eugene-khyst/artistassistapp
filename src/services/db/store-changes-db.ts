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

import {dbPromise, type DBReadTransaction, type DBReadWriteTransaction} from '@/services/db/db';
import {
  STORE_CHANGE_NAMES,
  type StoreChangeName,
  type StoreChangeTokens,
} from '@/services/db/types';

export async function markStoreChanged(
  tx: DBReadWriteTransaction,
  storeName: StoreChangeName
): Promise<string> {
  const token = crypto.randomUUID();
  await tx.objectStore('store-changes').put(token, storeName);
  return token;
}

export async function getStoreChangeTokens(
  existingTx?: DBReadTransaction
): Promise<StoreChangeTokens> {
  const tx = existingTx ?? (await dbPromise).transaction(['store-changes']);
  const store = tx.objectStore('store-changes');
  const entries = (
    await Promise.all(
      STORE_CHANGE_NAMES.map(async (storeName): Promise<[StoreChangeName, string | undefined]> => [
        storeName,
        await store.get(storeName),
      ])
    )
  ).filter((entry): entry is [StoreChangeName, string] => entry[1] !== undefined);
  return Object.fromEntries(entries);
}
