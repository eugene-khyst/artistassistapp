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

import type {StateCreator} from 'zustand';

import {getPreferredLocale} from '~/src/i18n';
import {getAppSettings, saveAppSettings} from '~/src/services/db/app-settings-db';
import {imageFileToFile} from '~/src/services/image/image-file';
import type {AppSettings} from '~/src/services/settings/types';
import {importFromUrl} from '~/src/services/url/url-parser';
import type {AuthSlice} from '~/src/stores/auth-slice';
import type {LocaleSlice} from '~/src/stores/locale-slice';
import type {StyleTransferSlice} from '~/src/stores/style-transfer-slice';
import {TabKey} from '~/src/tabs';
import {getErrorMessage} from '~/src/utils/error';

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
  installRequested: boolean;

  isInitialStateLoading: boolean;

  initErrors: unknown[];

  initAppStore: () => Promise<void>;
  resetInstallRequested: () => void;
  loadAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (appSettings: Partial<AppSettings> | AppSettingsUpdater) => Promise<void>;
  addInitError: (label: string, error: unknown) => void;
  clearInitErrors: () => void;
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
  installRequested: false,

  isInitialStateLoading: false,

  initErrors: [],

  initAppStore: async (): Promise<void> => {
    if (get().appInitialized) {
      return;
    }

    const tryStep = async (label: string, fn: () => unknown): Promise<void> => {
      try {
        await fn();
      } catch (error) {
        get().addInitError(label, error);
      }
    };

    try {
      set({
        isInitialStateLoading: true,
      });
      let appSettings: AppSettings = {...DEFAULT_APP_SETTINGS};
      try {
        appSettings = await get().loadAppSettings();
      } catch (error) {
        get().addInitError('load app settings', error);
      }

      await tryStep('set locale', () =>
        get().setLocale(appSettings.locale ?? getPreferredLocale(), false)
      );
      await tryStep('initialize auth client', () => {
        get().initAuthClient();
      });
      await tryStep('handle auth callback', () => get().handleAuthCallback());

      const {colorSet: importedColorSet, tabKey: importedTabKey, login, install} = importFromUrl();

      if (login) {
        get().loginWithRedirect();
        return;
      }
      if (install) {
        set({installRequested: true});
      }
      let activeTabKey: TabKey | undefined = importedTabKey ?? appSettings.activeTabKey;
      if (importedColorSet) {
        activeTabKey = TabKey.ColorSet;
      }

      await tryStep('load color sets', () => get().loadColorSets(importedColorSet));
      await tryStep('load recent image files', () => get().loadRecentImageFiles());

      const {styleTransferImage} = appSettings;
      if (styleTransferImage) {
        await tryStep('set style image file', () =>
          get().setStyleImageFile(imageFileToFile(styleTransferImage))
        );
      }

      if (activeTabKey) {
        void get().setActiveTabKey(activeTabKey);
      }

      set({
        appInitialized: true,
      });

      get().startPeriodicAuthVerification();
    } finally {
      set({
        isInitialStateLoading: false,
      });
    }
  },
  resetInstallRequested: (): void => {
    set({
      installRequested: false,
    });
  },
  loadAppSettings: async (): Promise<AppSettings> => {
    const appSettings: AppSettings = {
      ...DEFAULT_APP_SETTINGS,
      ...(await getAppSettings()),
    };
    set({
      appSettings,
    });
    return appSettings;
  },
  saveAppSettings: async (update: Partial<AppSettings> | AppSettingsUpdater): Promise<void> => {
    const {appSettings} = get();
    const values: Partial<AppSettings> =
      typeof update === 'function' ? update(appSettings) : update;
    Object.assign(appSettings, values);
    await saveAppSettings(appSettings);
    set({
      appSettings,
    });
  },
  addInitError: (label: string, error: unknown): void => {
    console.error(`Failed to ${label}`, error);
    const wrappedError = new Error(`Failed to ${label}: ${getErrorMessage(error)}`, {cause: error});
    set(({initErrors}) => ({initErrors: [...initErrors, wrappedError]}));
  },
  clearInitErrors: (): void => {
    set({initErrors: []});
  },
});
