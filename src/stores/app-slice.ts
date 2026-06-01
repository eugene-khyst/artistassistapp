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
import {normalizeInjectedAuthCallback} from '~/src/services/auth/auth-callback-normalizer';
import {ForceLogoutError} from '~/src/services/auth/types';
import {getAppSettings, saveAppSettings} from '~/src/services/db/app-settings-db';
import {imageFileToFile} from '~/src/services/image/image-file';
import {DEFAULT_APP_SETTINGS} from '~/src/services/settings/app-settings';
import {type AppSettings} from '~/src/services/settings/types';
import {importFromUrl} from '~/src/services/url/url-parser';
import type {AuthSlice} from '~/src/stores/auth-slice';
import type {LocaleSlice} from '~/src/stores/locale-slice';
import type {StyleTransferSlice} from '~/src/stores/style-transfer-slice';
import {initAuthAttemptWatcher} from '~/src/stores/watchers/auth-attempt-watcher';
import {initAuthExpiryWatcher} from '~/src/stores/watchers/auth-expiry-watcher';
import {TabKey} from '~/src/tabs';
import {getErrorMessage} from '~/src/utils/error';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {ColorSetSlice} from './color-set-slice';
import type {OriginalImageSlice} from './original-image-slice';
import type {PaletteSlice} from './palette-slice';
import type {TabSlice} from './tab-slice';

export type AppSettingsUpdater = (prev?: AppSettings) => Partial<AppSettings>;

export interface AppSlice {
  appInitialized: boolean;
  appSettings: AppSettings;
  installRequested: boolean;

  isAppInitializing: boolean;

  initErrors: unknown[];

  initApp: () => Promise<void>;
  resetInstallRequested: () => void;
  loadAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (appSettings: Partial<AppSettings> | AppSettingsUpdater) => Promise<void>;
  addInitError: (label: string, error: unknown) => void;
  clearInitErrors: () => void;
}

export const createAppSlice: StateCreator<
  AppSlice &
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
  AppSlice
> = (set, get) => {
  const tryStep = async (label: string, fn: () => unknown): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      if (error instanceof ForceLogoutError) {
        void get().logout(error.type);
        return;
      }
      get().addInitError(label, error);
    }
  };
  return {
    appInitialized: false,
    appSettings: {...DEFAULT_APP_SETTINGS},
    installRequested: false,

    isAppInitializing: false,

    initErrors: [],

    initApp: async (): Promise<void> => {
      if (get().appInitialized) {
        return;
      }
      try {
        set({
          isAppInitializing: true,
        });

        let appSettings: AppSettings = {...DEFAULT_APP_SETTINGS};
        await tryStep('load app settings', async () => {
          appSettings = await get().loadAppSettings();
        });

        await tryStep('set locale', () =>
          get().setLocale(appSettings.locale ?? getPreferredLocale(), false)
        );

        await tryStep('normalize injected auth callback', () => normalizeInjectedAuthCallback());
        await tryStep('handle auth callback', () => get().handleAuthCallback());
        set({
          isAuthLoading: true,
        });
        try {
          await tryStep('resolve auth', () => get().resolveAuth());
        } finally {
          set({
            isAuthLoading: false,
          });
        }
        await tryStep('complete auth attempt', () => get().completeAuthAttempt());

        initAuthAttemptWatcher();

        const {colorSet: importedColorSet, tabKey: importedTabKey, install} = importFromUrl();

        if (install) {
          set({
            installRequested: true,
          });
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

        initAuthExpiryWatcher();
      } finally {
        set({
          isAppInitializing: false,
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
      const {appSettings: prevAppSettings} = get();
      const values: Partial<AppSettings> =
        typeof update === 'function' ? update(prevAppSettings) : update;
      const appSettings = {...prevAppSettings, ...values};
      await saveAppSettings(appSettings);
      set({
        appSettings,
      });
    },

    addInitError: (label: string, error: unknown): void => {
      console.error(`Failed to ${label}`, error);
      const wrappedError = new Error(`Failed to ${label}: ${getErrorMessage(error)}`, {
        cause: error,
      });
      set(({initErrors}) => ({initErrors: [...initErrors, wrappedError]}));
    },

    clearInitErrors: (): void => {
      set({
        initErrors: [],
      });
    },
  };
};
