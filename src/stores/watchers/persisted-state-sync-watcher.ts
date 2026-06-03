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

import {getLastColorSet} from '@/services/db/color-set-db';
import {useAppStore} from '@/stores/app-store';

let initialized = false;

async function syncPersistedState(): Promise<void> {
  const {
    appSettings: staleAppSettings,
    latestColorSet: staleLatestColorSet,
    loadAppSettings,
  } = useAppStore.getState();

  const storedAppSettings = await loadAppSettings();
  const storedLatestColorSet = (await getLastColorSet()) ?? null;

  const {loadColorSets, refreshStyledImage, setLayeringEnabled, setSurface} =
    useAppStore.getState();

  if (storedLatestColorSet?.date?.getTime() !== staleLatestColorSet?.date?.getTime()) {
    await loadColorSets();
  }
  if (storedAppSettings.colorPickerSurfaceHex !== staleAppSettings.colorPickerSurfaceHex) {
    await setSurface(storedAppSettings.colorPickerSurfaceHex, {persist: false});
  }
  if (
    storedAppSettings.colorPickerLayeringEnabled !== staleAppSettings.colorPickerLayeringEnabled
  ) {
    await setLayeringEnabled(storedAppSettings.colorPickerLayeringEnabled, {persist: false});
  }
  if (
    storedAppSettings.styleTransferImage?.digest !== staleAppSettings.styleTransferImage?.digest
  ) {
    refreshStyledImage();
  }
}

function runSyncWhenVisible(): void {
  if (document.visibilityState !== 'hidden') {
    void syncPersistedState();
  }
}

export function initPersistedStateSyncWatcher(): void {
  if (initialized) {
    return;
  }
  initialized = true;
  document.addEventListener('visibilitychange', runSyncWhenVisible);
  window.addEventListener('pageshow', runSyncWhenVisible);
}
