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

import {saveAs} from 'file-saver';
import type {StateCreator} from 'zustand';

import {fromCustomColorBrandSource, parseCustomColorBrandJson} from '@/services/cloud/cloud-state';
import {type CustomColorBrandJson, FileExtension} from '@/services/cloud/types';
import type {CustomColorBrandDefinition, CustomColorBrandSource} from '@/services/color/types';
import {
  deleteCustomColorBrand,
  getAllCustomColorBrands,
  saveCustomColorBrands,
} from '@/services/db/custom-brand-db';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {ColorSetSlice} from '@/stores/color-set-slice';
import {persistChange} from '@/stores/sync/persist-change';

export interface CustomColorBrandSlice {
  customColorBrands: CustomColorBrandDefinition[];
  // Bumped only when custom brands are reloaded from IDB (init, cloud download, cross-tab wake).
  customColorBrandsReloadCount: number;
  isCustomColorBrandsLoading: boolean;

  loadCustomColorBrands: () => Promise<void>;
  saveCustomColorBrand: (brand: CustomColorBrandSource) => Promise<CustomColorBrandDefinition>;
  deleteCustomColorBrand: (idToDelete?: number) => Promise<void>;
  importCustomColorBrandFromJson: (file: File) => Promise<CustomColorBrandDefinition | undefined>;
  exportCustomColorBrandToJson: (brand: CustomColorBrandSource) => void;
}

type CustomColorBrandSliceDependencies = Pick<AppSlice, 'saveStoreChangeTokens'> &
  Pick<CloudSlice, 'pushCloudState'> &
  Pick<ColorSetSlice, 'loadColorSets' | 'activateLatestColorSet'>;

export const createCustomColorBrandSlice: StateCreator<
  CustomColorBrandSlice & CustomColorBrandSliceDependencies,
  [],
  [],
  CustomColorBrandSlice
> = (set, get) => ({
  customColorBrands: [],
  customColorBrandsReloadCount: 0,
  isCustomColorBrandsLoading: false,

  loadCustomColorBrands: async (): Promise<void> => {
    set({
      isCustomColorBrandsLoading: true,
    });
    set({
      customColorBrands: await getAllCustomColorBrands(),
      customColorBrandsReloadCount: get().customColorBrandsReloadCount + 1,
      isCustomColorBrandsLoading: false,
    });
  },

  saveCustomColorBrand: async (
    source: CustomColorBrandSource
  ): Promise<CustomColorBrandDefinition> => {
    const brand = fromCustomColorBrandSource(source);
    await persistChange(get, () => saveCustomColorBrands([brand]));
    set({
      customColorBrands: [
        brand,
        ...get().customColorBrands.filter(({id}: CustomColorBrandDefinition) => id !== brand.id),
      ],
    });
    return brand;
  },

  deleteCustomColorBrand: async (idToDelete?: number): Promise<void> => {
    if (!idToDelete) {
      return;
    }
    const tokens = await persistChange(get, () => deleteCustomColorBrand(idToDelete));
    set({
      customColorBrands: get().customColorBrands.filter(
        ({id}: CustomColorBrandDefinition) => id !== idToDelete
      ),
    });
    if (tokens['color-sets']) {
      await get().loadColorSets();
      await get().activateLatestColorSet();
    }
  },

  importCustomColorBrandFromJson: async (
    file: File
  ): Promise<CustomColorBrandDefinition | undefined> => {
    const brand = parseCustomColorBrandJson(await file.text());
    if (!brand) {
      return;
    }
    return await get().saveCustomColorBrand(brand);
  },

  exportCustomColorBrandToJson: ({id: _, ...brand}: CustomColorBrandSource): void => {
    const json: string = JSON.stringify(brand satisfies CustomColorBrandJson, null, 2);
    saveAs(
      new Blob([json], {type: 'application/json'}),
      `${brand.name}${FileExtension.CustomColorBrand}`
    );
  },
});
