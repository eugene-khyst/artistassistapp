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

import {dbPromise} from './db';

const KEY = 0;

export interface AuthErrorData {
  context?: Record<string, unknown>;
}

export async function saveAuthErrorData(data: AuthErrorData): Promise<void> {
  const db = await dbPromise;
  await db.put('auth-error', data, KEY);
}

export async function getAndDeleteAuthErrorData(): Promise<AuthErrorData | undefined> {
  const db = await dbPromise;
  const tx = db.transaction('auth-error', 'readwrite');
  const data = await tx.store.get(KEY);
  if (data) {
    await tx.store.delete(KEY);
  }
  await tx.done;
  return data;
}

export async function saveIdToken(jwt: string): Promise<void> {
  const db = await dbPromise;
  await db.put('id-token', jwt, KEY);
}

export async function getIdToken(): Promise<string | undefined> {
  const db = await dbPromise;
  return await db.get('id-token', KEY);
}

export async function deleteIdToken(): Promise<void> {
  const db = await dbPromise;
  await db.delete('id-token', KEY);
}
