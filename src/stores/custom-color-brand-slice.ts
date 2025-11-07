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

import {saveAs} from 'file-saver';
import type {StateCreator} from 'zustand';

import {Rgb} from '~/src/services/color/space/rgb';
import {
  type ColorDefinition,
  type CustomColorBrandDefinition,
  FileExtension,
} from '~/src/services/color/types';
import {
  deleteCustomColorBrand,
  getCustomColorBrands,
  getLastCustomColorBrand,
  saveCustomColorBrand,
} from '~/src/services/db/custom-brand-db';

function calculateRho(brand: CustomColorBrandDefinition): CustomColorBrandDefinition {
  const {colors} = brand;
  return {
    ...brand,
    colors: colors?.map(({hex, ...color}: Partial<ColorDefinition>): Partial<ColorDefinition> => {
      return {
        ...color,
        hex,
        rho: [...Rgb.fromHex(hex!).toReflectance().toArray()],
      };
    }),
  };
}

export function removeRho(brand: CustomColorBrandDefinition): CustomColorBrandDefinition {
  const {colors} = brand;
  return {
    ...brand,
    colors: colors?.map(
      ({rho: _, ...color}: Partial<ColorDefinition>): Partial<ColorDefinition> => {
        return color;
      }
    ),
  };
}

export interface CustomColorBrandSlice {
  customColorBrands: CustomColorBrandDefinition[];
  latestCustomColorBrand: CustomColorBrandDefinition | null;
  isCustomColorBrandsLoading: boolean;

  loadCustomColorBrands: () => Promise<void>;
  saveCustomColorBrand: (brand: CustomColorBrandDefinition) => Promise<CustomColorBrandDefinition>;
  loadCustomColorBrandFromJson: (file: File) => Promise<CustomColorBrandDefinition | undefined>;
  saveCustomColorBrandAsJson: (brand: CustomColorBrandDefinition) => void;
  deleteCustomColorBrand: (idToDelete?: number) => Promise<void>;
}

export const createCustomColorBrandSlice: StateCreator<
  CustomColorBrandSlice,
  [],
  [],
  CustomColorBrandSlice
> = (set, get) => ({
  customColorBrands: [],
  latestCustomColorBrand: null,
  isCustomColorBrandsLoading: false,

  loadCustomColorBrands: async (): Promise<void> => {
    set({
      isCustomColorBrandsLoading: true,
    });
    set({
      customColorBrands: await getCustomColorBrands(),
      latestCustomColorBrand: await getLastCustomColorBrand(),
      isCustomColorBrandsLoading: false,
    });
  },
  saveCustomColorBrand: async (
    brand: CustomColorBrandDefinition
  ): Promise<CustomColorBrandDefinition> => {
    const {id, ...brandWithoutId} = brand;
    brand = {
      ...calculateRho(brandWithoutId),
      ...(id ? {id} : {}),
    };
    await saveCustomColorBrand(brand);
    set({
      customColorBrands: [
        brand,
        ...get().customColorBrands.filter(({id}: CustomColorBrandDefinition) => id !== brand.id),
      ],
    });
    return brand;
  },
  loadCustomColorBrandFromJson: async (
    file: File
  ): Promise<CustomColorBrandDefinition | undefined> => {
    try {
      const json: string = await file.text();
      let brand = JSON.parse(json) as CustomColorBrandDefinition;
      brand = await get().saveCustomColorBrand(brand);
      return brand;
    } catch (e) {
      console.error(e);
    }
    return;
  },
  saveCustomColorBrandAsJson: (brand: CustomColorBrandDefinition): void => {
    const json: string = JSON.stringify(brand, null, 2);
    saveAs(
      new Blob([json], {type: 'application/json'}),
      `${brand.name}${FileExtension.CustomColorBrand}`
    );
  },
  deleteCustomColorBrand: async (idToDelete?: number): Promise<void> => {
    if (idToDelete) {
      await deleteCustomColorBrand(idToDelete);
      set({
        customColorBrands: get().customColorBrands.filter(
          ({id}: CustomColorBrandDefinition) => id !== idToDelete
        ),
      });
    }
  },
});
