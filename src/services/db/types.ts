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

export const STORE_CHANGE_NAMES = [
  'cloud-connection',
  'custom-brands',
  'color-sets',
  'images',
  'color-mixtures',
] as const;

export type StoreChangeName = (typeof STORE_CHANGE_NAMES)[number];
export type StoreChangeTokens = Partial<Record<StoreChangeName, string>>;

export function areStoreChangeTokensEqual(
  first: StoreChangeTokens,
  second: StoreChangeTokens
): boolean {
  return STORE_CHANGE_NAMES.every(storeName => first[storeName] === second[storeName]);
}
