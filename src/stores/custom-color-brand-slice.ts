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

import type {CustomColorBrandDefinition} from '~/src/services/color/types';
import {
  deleteCustomColorBrand,
  getCustomColorBrands,
  saveCustomColorBrand,
} from '~/src/services/db/custom-brand-db';

export interface CustomColorBrandSlice {
  customColorBrands: CustomColorBrandDefinition[];

  loadCustomColorBrands: () => Promise<void>;
  saveCustomColorBrand: (brand: CustomColorBrandDefinition) => Promise<CustomColorBrandDefinition>;
  deleteCustomColorBrand: (idToDelete?: number) => Promise<void>;
}

export const createCustomColorBrandSlice: StateCreator<
  CustomColorBrandSlice,
  [],
  [],
  CustomColorBrandSlice
> = (set, get) => ({
  customColorBrands: [],

  loadCustomColorBrands: async (): Promise<void> => {
    set({
      customColorBrands: await getCustomColorBrands(),
    });
  },
  saveCustomColorBrand: async (
    brand: CustomColorBrandDefinition
  ): Promise<CustomColorBrandDefinition> => {
    await saveCustomColorBrand(brand);
    set({
      customColorBrands: [
        brand,
        ...get().customColorBrands.filter(({id}: CustomColorBrandDefinition) => id !== brand.id),
      ],
    });
    return brand;
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
