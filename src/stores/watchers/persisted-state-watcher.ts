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

import {getStoreChangeTokens} from '@/services/db/store-changes-db';
import {useAppStore} from '@/stores/app-store';
import {reloadStores} from '@/stores/sync/store-reloads';
import {dedupeConcurrentCalls} from '@/utils/concurrency';

let initialized = false;

const reloadPersistedState = dedupeConcurrentCalls(async (): Promise<void> => {
  const state = useAppStore.getState();
  const {
    appSettings: staleSettings,
    loadAppSettings,
    refreshStyledImage,
    setLayeringEnabled,
    setSurface,
  } = state;

  const [storedSettings, storedTokens] = await Promise.all([
    loadAppSettings(),
    getStoreChangeTokens(),
  ]);

  await reloadStores(state, storedTokens);
  if (storedSettings.colorPickerSurfaceHex !== staleSettings.colorPickerSurfaceHex) {
    await setSurface(storedSettings.colorPickerSurfaceHex, {persist: false});
  }
  if (storedSettings.colorPickerLayeringEnabled !== staleSettings.colorPickerLayeringEnabled) {
    await setLayeringEnabled(storedSettings.colorPickerLayeringEnabled, {persist: false});
  }
  if (storedSettings.styleTransferImageDigest !== staleSettings.styleTransferImageDigest) {
    await refreshStyledImage();
  }
  await useAppStore.getState().checkCloudSyncUpdate();
});

function runSyncWhenVisible(): void {
  if (document.visibilityState !== 'hidden') {
    void reloadPersistedState();
  }
}

export function initPersistedStateWatcher(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  document.addEventListener('visibilitychange', runSyncWhenVisible);
  window.addEventListener('pageshow', runSyncWhenVisible);
}
