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

import {ForceLogoutError} from '@/services/auth/errors';
import {clearCloudAccessToken} from '@/services/cloud/cloud-connection-client';
import type {StoreChangeName, StoreChangeTokens} from '@/services/db/types';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {ColorSetSlice} from '@/stores/color-set-slice';
import type {CustomColorBrandSlice} from '@/stores/custom-color-brand-slice';
import type {OriginalImageSlice} from '@/stores/original-image-slice';
import type {PaletteSlice} from '@/stores/palette-slice';

type ReloadableState = AppSlice &
  CloudSlice &
  CustomColorBrandSlice &
  ColorSetSlice &
  OriginalImageSlice &
  PaletteSlice;

interface StoreReload {
  tokens: StoreChangeName[];
  label: string;
  reload: (state: ReloadableState) => Promise<void>;
}

const STORE_RELOADS: StoreReload[] = [
  {
    tokens: ['cloud-connection'],
    label: 'load cloud connection',
    reload: async state => {
      clearCloudAccessToken();
      await state.loadCloudConnection();
    },
  },
  {
    tokens: ['custom-brands'],
    label: 'load custom color brands',
    reload: state => state.loadCustomColorBrands(),
  },
  {
    tokens: ['custom-brands', 'color-sets'],
    label: 'load color sets',
    reload: async state => {
      await state.loadColorSets();
      await state.activateLatestColorSet();
    },
  },
  {
    tokens: ['images'],
    label: 'load recent image files',
    reload: state => state.loadRecentImages(),
  },
  {
    tokens: ['color-mixtures'],
    label: 'load palette color mixtures',
    reload: state => state.loadPaletteColorMixtures(),
  },
];

function rethrowOrLog(label: string, error: unknown): void {
  if (error instanceof ForceLogoutError) {
    throw error;
  }
  console.error(`Failed to ${label}`, error);
}

export async function reloadStores(
  state: ReloadableState,
  storedTokens?: StoreChangeTokens,
  onError: (label: string, error: unknown) => void = rethrowOrLog
): Promise<void> {
  const staleTokens = state.storeChangeTokens;
  for (const {tokens, label, reload} of STORE_RELOADS) {
    if (
      storedTokens &&
      !tokens.some(
        name => storedTokens[name] !== undefined && storedTokens[name] !== staleTokens[name]
      )
    ) {
      continue;
    }
    try {
      await reload(state);
      if (storedTokens) {
        state.saveStoreChangeTokens(
          Object.fromEntries(
            tokens
              .filter(name => storedTokens[name] !== undefined)
              .map(name => [name, storedTokens[name]])
          )
        );
      }
    } catch (error) {
      onError(label, error);
    }
  }
}
