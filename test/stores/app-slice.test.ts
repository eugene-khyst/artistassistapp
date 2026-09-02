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

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {type AppSettings, DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import {type AppSlice, createAppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {ColorSetSlice} from '@/stores/color-set-slice';
import type {CropSlice} from '@/stores/crop-slice';
import type {CustomColorBrandSlice} from '@/stores/custom-color-brand-slice';
import type {ExpandImageSlice} from '@/stores/expand-image-slice';
import type {LocaleSlice} from '@/stores/locale-slice';
import type {OriginalImageSlice} from '@/stores/original-image-slice';
import type {PaletteSlice} from '@/stores/palette-slice';
import type {TabSlice} from '@/stores/tab-slice';
import {DEFAULT_TAB_KEY, TabKey} from '@/tabs';

vi.mock('@/i18n', () => ({
  getPreferredLocale: vi.fn(() => 'en'),
}));

const appSettingsDb = vi.hoisted(() => ({
  getAppSettings: vi.fn(),
  updateStoredAppSettings: vi.fn(),
}));

vi.mock('@/services/db/app-settings-db', () => appSettingsDb);

vi.mock('@/stores/sync/store-reloads', () => ({
  reloadStores: vi.fn(async (): Promise<void> => undefined),
}));

vi.mock('@/stores/watchers/auth-attempt-watcher', () => ({
  initAuthAttemptWatcher: vi.fn(),
}));

vi.mock('@/stores/watchers/auth-expiry-watcher', () => ({
  initAuthExpiryWatcher: vi.fn(),
}));

vi.mock('@/stores/watchers/persisted-state-watcher', () => ({
  initPersistedStateWatcher: vi.fn(),
}));

type TestStore = AppSlice &
  Pick<LocaleSlice, 'setLocale'> &
  Pick<
    AuthSlice,
    'handleLoginCallback' | 'setAuthError' | 'resolveAuth' | 'reconcileAuthAttempt' | 'logout'
  > &
  Pick<CloudSlice, 'loadCloudConnection' | 'handleCloudCallback' | 'syncCloudState'> &
  Pick<CustomColorBrandSlice, 'loadCustomColorBrands'> &
  Pick<CropSlice, 'loadCropSettings'> &
  Pick<ExpandImageSlice, 'loadExpandImageSettings'> &
  Pick<TabSlice, 'setActiveTabKey'> &
  Pick<ColorSetSlice, 'loadColorSets'> &
  Pick<OriginalImageSlice, 'loadRecentImages' | 'selectLatestImageFile'> &
  Pick<PaletteSlice, 'loadPaletteColorMixtures'>;

function createTestStore(appSettings: AppSettings) {
  const loadCropSettings = vi.fn();
  const loadExpandImageSettings = vi.fn();
  const setActiveTabKey = vi.fn(
    async (
      _activeTabKey: TabKey,
      _options?: {skipUnsavedChangesCheck?: boolean}
    ): Promise<boolean> => true
  );
  const store = createStore<TestStore>()((...args) => ({
    setLocale: vi.fn(async (): Promise<void> => undefined),
    handleLoginCallback: vi.fn(async (): Promise<void> => undefined),
    setAuthError: vi.fn(),
    resolveAuth: vi.fn(async (): Promise<void> => undefined),
    reconcileAuthAttempt: vi.fn(async (): Promise<void> => undefined),
    logout: vi.fn(async (): Promise<void> => undefined),
    loadCloudConnection: vi.fn(async () => null),
    handleCloudCallback: vi.fn(async (): Promise<void> => undefined),
    syncCloudState: vi.fn(async (): Promise<void> => undefined),
    loadCustomColorBrands: vi.fn(async (): Promise<void> => undefined),
    loadCropSettings,
    loadExpandImageSettings,
    setActiveTabKey,
    loadColorSets: vi.fn(async (): Promise<void> => undefined),
    loadRecentImages: vi.fn(async (): Promise<void> => undefined),
    selectLatestImageFile: vi.fn(async (): Promise<void> => undefined),
    loadPaletteColorMixtures: vi.fn(async (): Promise<void> => undefined),
    ...createAppSlice(...args),
  }));
  const loadStoredAppSettings = store.getState().loadAppSettings;
  store.setState({
    loadAppSettings: vi.fn(async (): Promise<AppSettings> => appSettings),
    loadStoreChangeTokens: vi.fn(async () => ({})),
  });
  return {
    loadCropSettings,
    loadExpandImageSettings,
    loadStoredAppSettings,
    setActiveTabKey,
    store,
  };
}

describe('app slice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {location: new URL('https://app.example/')});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads stored image editor preferences', async () => {
    const storedSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      cropAspectRatio: '4:5',
      expandAspectRatio: '16:9',
      expandSizeMode: 'margins',
      expandFillMode: 'smart',
    };
    appSettingsDb.getAppSettings.mockResolvedValueOnce(storedSettings);
    const {loadCropSettings, loadExpandImageSettings, loadStoredAppSettings, store} =
      createTestStore(DEFAULT_APP_SETTINGS);

    await expect(loadStoredAppSettings()).resolves.toEqual(storedSettings);

    expect(store.getState().appSettings).toEqual(storedSettings);
    expect(loadCropSettings).toHaveBeenCalledExactlyOnceWith(storedSettings);
    expect(loadExpandImageSettings).toHaveBeenCalledExactlyOnceWith(storedSettings);
  });

  it('falls back to the default tab when the stored tab key is invalid', async () => {
    const {setActiveTabKey, store} = createTestStore({
      ...DEFAULT_APP_SETTINGS,
      locale: 'en',
      activeTabKey: 'perspective-correction' as TabKey,
    });

    await store.getState().initApp();

    expect(setActiveTabKey).toHaveBeenCalledWith(DEFAULT_TAB_KEY, {
      skipUnsavedChangesCheck: true,
    });
  });

  it('restores a valid stored tab key', async () => {
    const {setActiveTabKey, store} = createTestStore({
      ...DEFAULT_APP_SETTINGS,
      locale: 'en',
      activeTabKey: TabKey.Grid,
    });

    await store.getState().initApp();

    expect(setActiveTabKey).toHaveBeenCalledWith(TabKey.Grid, {
      skipUnsavedChangesCheck: true,
    });
  });
});
