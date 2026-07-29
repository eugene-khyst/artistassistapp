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

import {getPreferredLocale} from '@/i18n';
import {ForceLogoutError} from '@/services/auth/errors';
import {getAppSettings, updateStoredAppSettings} from '@/services/db/app-settings-db';
import {saveColorSets} from '@/services/db/color-set-db';
import {getStoreChangeTokens} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';
import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import {type AppSettings} from '@/services/settings/types';
import {parseUrl} from '@/services/url/url-parser';
import type {AuthSlice} from '@/stores/auth-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {CustomColorBrandSlice} from '@/stores/custom-color-brand-slice';
import type {LocaleSlice} from '@/stores/locale-slice';
import type {StyleTransferSlice} from '@/stores/style-transfer-slice';
import {reloadStores} from '@/stores/sync/store-reloads';
import {initAuthAttemptWatcher} from '@/stores/watchers/auth-attempt-watcher';
import {initAuthExpiryWatcher} from '@/stores/watchers/auth-expiry-watcher';
import {initPersistedStateWatcher} from '@/stores/watchers/persisted-state-watcher';
import {TabKey} from '@/tabs';
import {getErrorMessage} from '@/utils/error';
import {replaceHistory} from '@/utils/history';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {ColorSetSlice} from './color-set-slice';
import type {OriginalImageSlice} from './original-image-slice';
import type {PaletteSlice} from './palette-slice';
import type {TabSlice} from './tab-slice';

type AppSettingsUpdater = (prev: AppSettings) => Partial<AppSettings>;

export interface AppSlice {
  appInitialized: boolean;
  appSettings: AppSettings;
  storeChangeTokens: StoreChangeTokens;
  installRequested: boolean;

  isAppInitializing: boolean;

  initErrors: unknown[];

  initApp: () => Promise<void>;
  resetInstallRequested: () => void;
  loadAppSettings: () => Promise<AppSettings>;
  saveAppSettings: (appSettings: Partial<AppSettings> | AppSettingsUpdater) => Promise<AppSettings>;
  loadStoreChangeTokens: () => Promise<StoreChangeTokens>;
  saveStoreChangeTokens: (tokens: StoreChangeTokens) => void;
  addInitError: (label: string, error: unknown) => void;
  clearInitErrors: () => void;
}

export const createAppSlice: StateCreator<
  AppSlice &
    LocaleSlice &
    AuthSlice &
    CloudSlice &
    CustomColorBrandSlice &
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
  const runInitStepSafely = async (label: string, fn: () => unknown): Promise<void> => {
    try {
      await fn();
    } catch (error) {
      if (error instanceof ForceLogoutError) {
        throw error;
      }
      get().addInitError(label, error);
    }
  };
  return {
    appInitialized: false,
    appSettings: {...DEFAULT_APP_SETTINGS},
    storeChangeTokens: {},
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
        await runInitStepSafely('load app settings', async () => {
          appSettings = await get().loadAppSettings();
        });

        await runInitStepSafely('set locale', () =>
          get().setLocale(appSettings.locale ?? getPreferredLocale(), false)
        );

        const {
          loginCallback,
          loggedOut,
          cloudCallback,
          install,
          tabKey: importedTabKey,
          colorSet: importedColorSet,
        } = parseUrl(window.location.toString());

        if (loginCallback) {
          await get().handleLoginCallback(loginCallback.completionToken);
        }

        if (loggedOut?.error) {
          get().setAuthError(loggedOut.error);
        }

        await runInitStepSafely('resolve auth', () => get().resolveAuth({showLoading: true}));

        await runInitStepSafely('reconcile auth attempt', () => get().reconcileAuthAttempt());

        initAuthAttemptWatcher();

        await runInitStepSafely('load cloud connection', () => get().loadCloudConnection());

        if (cloudCallback) {
          const {completed, error} = cloudCallback;
          await runInitStepSafely('handle cloud callback', () =>
            get().handleCloudCallback(completed, error)
          );
        }
        if (install) {
          set({
            installRequested: true,
          });
        }
        let activeTabKey: TabKey | undefined = importedTabKey ?? appSettings.activeTabKey;
        if (importedColorSet) {
          activeTabKey = TabKey.ColorSet;
          await runInitStepSafely('save imported color set', () =>
            saveColorSets([importedColorSet])
          );
        }
        if (
          loginCallback ||
          loggedOut ||
          importedColorSet ||
          importedTabKey ||
          install ||
          cloudCallback
        ) {
          replaceHistory();
        }

        await runInitStepSafely('load store change tokens', () => get().loadStoreChangeTokens());

        await reloadStores(get(), undefined, (label, error) => {
          if (error instanceof ForceLogoutError) {
            throw error;
          }
          get().addInitError(label, error);
        });

        await runInitStepSafely('select latest image file', () => get().selectLatestImageFile());

        void get().syncCloudState();

        initPersistedStateWatcher();

        if (activeTabKey) {
          void get().setActiveTabKey(activeTabKey);
        }

        set({
          appInitialized: true,
        });

        initAuthExpiryWatcher();
      } catch (error) {
        if (error instanceof ForceLogoutError) {
          void get().logout(error.type);
          return;
        }
        throw error;
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

    saveAppSettings: async (
      update: Partial<AppSettings> | AppSettingsUpdater
    ): Promise<AppSettings> => {
      const appSettings = await updateStoredAppSettings(prev => ({
        ...prev,
        ...(typeof update === 'function' ? update(prev) : update),
      }));
      set({
        appSettings,
      });
      return appSettings;
    },

    loadStoreChangeTokens: async (): Promise<StoreChangeTokens> => {
      const storeChangeTokens = await getStoreChangeTokens();
      set({
        storeChangeTokens,
      });
      return storeChangeTokens;
    },

    saveStoreChangeTokens: (tokens: StoreChangeTokens): void => {
      set(({storeChangeTokens}) => ({
        storeChangeTokens: {
          ...storeChangeTokens,
          ...tokens,
        },
      }));
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
