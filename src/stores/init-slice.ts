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

import type {User} from '~/src/services/auth/types';
import {fetchColorBrands, fetchColorsBulk, toColorSet} from '~/src/services/color/colors';
import type {ColorDefinition, ColorMixture, ColorSetDefinition} from '~/src/services/color/types';
import {getAppSettings} from '~/src/services/db/app-settings-db';
import {getColorMixtures} from '~/src/services/db/color-mixture-db';
import {getLastColorSet} from '~/src/services/db/color-set-db';
import {getImageFiles, getLastImageFile} from '~/src/services/db/image-file-db';
import {type ImageFile, imageFileToFile} from '~/src/services/image/image-file';
import type {AppSettings} from '~/src/services/settings/types';
import {importFromUrl} from '~/src/services/url/url-parser';
import type {StyleTransferSlice} from '~/src/stores/style-transfer-slice';
import {TabKey} from '~/src/tabs';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {ColorSetSlice} from './color-set-slice';
import type {OriginalImageSlice} from './original-image-slice';
import type {PaletteSlice} from './palette-slice';
import type {TabSlice} from './tab-slice';

export interface InitSlice {
  appSettings: AppSettings;

  isInitialStateLoading: boolean;

  importedColorSet: ColorSetDefinition | null;
  latestColorSet: ColorSetDefinition | null;

  initAppStore: (user: User | null) => Promise<void>;
}

export const createInitSlice: StateCreator<
  InitSlice &
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
  appSettings: {},

  isInitialStateLoading: false,

  importedColorSet: null,
  latestColorSet: null,

  initAppStore: async (user: User | null): Promise<void> => {
    set({
      isInitialStateLoading: true,
    });

    const {colorSet: importedColorSet, tabKey: importedTabKey} = importFromUrl();

    const appSettings: AppSettings | undefined = (await getAppSettings()) ?? {};
    let activeTabKey: TabKey | undefined = importedTabKey ?? appSettings.activeTabKey;
    if (importedColorSet) {
      activeTabKey = TabKey.ColorSet;
    }

    const imageFile: ImageFile | undefined = await getLastImageFile();
    if (imageFile) {
      await get().setImageFile(imageFile, false);
    }

    if (activeTabKey) {
      void get().setActiveTabKey(activeTabKey);
    }

    const latestColorSet: ColorSetDefinition | null =
      (!importedColorSet && (await getLastColorSet())) || null;
    const recentImageFiles: ImageFile[] = await getImageFiles();
    const paletteColorMixtures = new Map<string, ColorMixture>(
      (await getColorMixtures(imageFile?.id)).map(colorMixture => [colorMixture.key, colorMixture])
    );

    const {styleTransferImage} = appSettings;
    if (styleTransferImage) {
      await get().setStyleImageFile(imageFileToFile(styleTransferImage));
    }

    set({
      appSettings,
      importedColorSet,
      latestColorSet,
      recentImageFiles,
      paletteColorMixtures,
      isInitialStateLoading: false,
    });

    if (importedColorSet?.type) {
      void get().loadColorSetsByType(importedColorSet.type);
    }
    if (latestColorSet) {
      const {type, brands: brandIds} = latestColorSet;
      if (!type || !brandIds) {
        return;
      }
      void get().loadColorSetsByType(type);

      const brands = await fetchColorBrands(type);
      const brandAliases = brandIds
        .map((id: number): string | undefined => brands.get(id)?.alias)
        .filter((alias): alias is string => !!alias);
      const colors: Map<string, Map<number, ColorDefinition>> = await fetchColorsBulk(
        type,
        brandAliases
      );
      const colorSet = toColorSet(user, latestColorSet, brands, colors);
      if (colorSet) {
        void get().setColorSet(colorSet, false);
      }
    }
  },
});
