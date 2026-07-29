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

import type {CloudConnection, CloudConnectionAttempt} from '@/services/cloud/types';
import {dbPromise} from '@/services/db/db';
import {markStoreChanged} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';

const KEY = 0;

export async function getCloudConnection(): Promise<CloudConnection | undefined> {
  const db = await dbPromise;
  return await db.get('cloud-connection', KEY);
}

export async function saveCloudConnection(
  cloudConnection: CloudConnection,
  {markStoreChanges = true}: {markStoreChanges?: boolean} = {}
): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  if (!markStoreChanges) {
    await db.put('cloud-connection', cloudConnection, KEY);
    return {};
  }
  const tx = db.transaction(['cloud-connection', 'store-changes'], 'readwrite');
  await tx.objectStore('cloud-connection').put(cloudConnection, KEY);
  const tokens: StoreChangeTokens = {
    'cloud-connection': await markStoreChanged(tx, 'cloud-connection'),
  };
  await tx.done;
  return tokens;
}

export async function deleteCloudConnection(): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['cloud-connection', 'store-changes'], 'readwrite');
  await tx.objectStore('cloud-connection').delete(KEY);
  const tokens: StoreChangeTokens = {
    'cloud-connection': await markStoreChanged(tx, 'cloud-connection'),
  };
  await tx.done;
  return tokens;
}

export async function deleteCloudConnectionAndSync(): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['cloud-connection', 'cloud-sync', 'store-changes'], 'readwrite');
  const cloudConnection = await tx.objectStore('cloud-connection').get(KEY);
  await tx.objectStore('cloud-connection').delete(KEY);
  if (cloudConnection) {
    await tx.objectStore('cloud-sync').delete(cloudConnection.id);
  }
  const tokens: StoreChangeTokens = {
    'cloud-connection': await markStoreChanged(tx, 'cloud-connection'),
  };
  await tx.done;
  return tokens;
}

export async function getCloudConnectionAttempt(): Promise<CloudConnectionAttempt | undefined> {
  const db = await dbPromise;
  return await db.get('cloud-connection-attempt', KEY);
}

export async function saveCloudConnectionAttempt(attempt: CloudConnectionAttempt): Promise<void> {
  const db = await dbPromise;
  await db.put('cloud-connection-attempt', attempt, KEY);
}

export async function deleteCloudConnectionAttempt(): Promise<void> {
  const db = await dbPromise;
  await db.delete('cloud-connection-attempt', KEY);
}

export async function deleteCloudConnectionAttemptIfVerifier(verifier: string): Promise<boolean> {
  const db = await dbPromise;
  const tx = db.transaction('cloud-connection-attempt', 'readwrite');
  const attempt = await tx.store.get(KEY);

  if (attempt?.verifier !== verifier) {
    await tx.done;
    return false;
  }

  await tx.store.delete(KEY);
  await tx.done;
  return true;
}
