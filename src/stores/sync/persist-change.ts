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

import type {StoreChangeTokens} from '@/services/db/types';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import {debounce} from '@/utils/debounce';

const PUSH_DEBOUNCE_MS = 5000;

const schedulePush = debounce((pushCloudState: () => Promise<void>) => {
  void pushCloudState();
}, PUSH_DEBOUNCE_MS);

export async function persistChange(
  get: () => Pick<CloudSlice & AppSlice, 'saveStoreChangeTokens' | 'pushCloudState'>,
  write: () => Promise<StoreChangeTokens>
): Promise<StoreChangeTokens> {
  const tokens = await write();
  get().saveStoreChangeTokens(tokens);
  schedulePush(get().pushCloudState);
  return tokens;
}
