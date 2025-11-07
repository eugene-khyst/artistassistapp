/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import type {StateCreator} from 'zustand';

import {getCurrentLocale} from '~/src/i18n';
import {getAppSettings, saveAppSettings} from '~/src/services/db/app-settings-db';
import {imageFileToFile} from '~/src/services/image/image-file';
import type {AppSettings} from '~/src/services/settings/types';
import {importFromUrl} from '~/src/services/url/url-parser';
import type {AuthSlice} from '~/src/stores/auth-slice';
import type {LocaleSlice} from '~/src/stores/locale-slice';
import type {StyleTransferSlice} from '~/src/stores/style-transfer-slice';
import {TabKey} from '~/src/tabs';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {ColorSetSlice} from './color-set-slice';
import type {OriginalImageSlice} from './original-image-slice';
import type {PaletteSlice} from './palette-slice';
import type {TabSlice} from './tab-slice';

const DEFAULT_APP_SETTINGS: AppSettings = {
  autoSavingColorSetsJson: true,
};

export type AppSettingsUpdater = (prev?: AppSettings) => Partial<AppSettings>;

export interface InitSlice {
  appInitialized: boolean;
  appSettings: AppSettings;

  isInitialStateLoading: boolean;

  initAppStore: () => Promise<void>;
  loadAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (appSettings: Partial<AppSettings> | AppSettingsUpdater) => Promise<void>;
}

export const createInitSlice: StateCreator<
  InitSlice &
    LocaleSlice &
    AuthSlice &
    TabSlice &
    ColorSetSlice &
    ColorMixerSlice &
    OriginalImageSlice &
    PaletteSlice &
    StyleTransferSlice,
  [],
  [],
  InitSlice
> = (set, get) => ({
  appInitialized: false,
  appSettings: {},

  isInitialStateLoading: false,

  initAppStore: async (): Promise<void> => {
    set({
      isInitialStateLoading: true,
    });

    await get().setLocale(getCurrentLocale(), false);
    await get().handleAuthRedirectCallback();

    const {colorSet: importedColorSet, tabKey: importedTabKey} = importFromUrl();

    const appSettings: AppSettings = await get().loadAppSettings();
    let activeTabKey: TabKey | undefined = importedTabKey ?? appSettings.activeTabKey;
    if (importedColorSet) {
      activeTabKey = TabKey.ColorSet;
    }
    if (activeTabKey) {
      void get().setActiveTabKey(activeTabKey);
    }

    await get().loadColorSets(importedColorSet);
    await get().loadRecentImageFiles();
    await get().loadPaletteColorMixtures();

    const {styleTransferImage} = appSettings;
    if (styleTransferImage) {
      await get().setStyleImageFile(imageFileToFile(styleTransferImage));
    }

    set({
      appInitialized: true,
      isInitialStateLoading: false,
    });
  },
  loadAppSettings: async (): Promise<AppSettings> => {
    let appSettings: AppSettings = (await getAppSettings()) ?? {};
    appSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...appSettings,
    };
    set({
      appSettings,
    });
    return appSettings;
  },
  saveAppSettings: async (appSettings: AppSettings | AppSettingsUpdater): Promise<void> => {
    const {appSettings: prevAppSettings} = get();
    if (typeof appSettings === 'function') {
      appSettings = (appSettings as AppSettingsUpdater)(prevAppSettings);
    }
    appSettings = {
      ...prevAppSettings,
      ...appSettings,
    };
    await saveAppSettings(appSettings);
    set({
      appSettings,
    });
  },
});
