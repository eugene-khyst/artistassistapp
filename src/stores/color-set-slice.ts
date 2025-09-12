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

import {toColorSet} from '~/src/services/color/colors';
import type {
  ColorBrandDefinition,
  ColorDefinition,
  ColorSet,
  ColorSetDefinition,
  ColorType,
} from '~/src/services/color/types';
import {deleteColorSet, getColorSetsByType, saveColorSet} from '~/src/services/db/color-set-db';
import type {AuthSlice} from '~/src/stores/auth-slice';

import type {ColorMixerSlice} from './color-mixer-slice';

export interface ColorSetSlice {
  importedColorSet: ColorSetDefinition | null;
  latestColorSet: ColorSetDefinition | null;
  colorSetsByType: ColorSetDefinition[];

  isColorSetsByTypeLoading: boolean;

  loadColorSetsByType: (type: ColorType) => Promise<ColorSetDefinition[]>;
  saveColorSet: (
    colorSetDefinition: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    setActiveTabKey?: boolean
  ) => Promise<ColorSetDefinition>;
  deleteColorSet: (idToDelete: number) => Promise<void>;
}

export const createColorSetSlice: StateCreator<
  ColorSetSlice & ColorMixerSlice & AuthSlice,
  [],
  [],
  ColorSetSlice
> = (set, get) => ({
  colorSetsByType: [],
  importedColorSet: null,
  latestColorSet: null,

  isColorSetsByTypeLoading: false,

  loadColorSetsByType: async (type: ColorType): Promise<ColorSetDefinition[]> => {
    set({
      isColorSetsByTypeLoading: true,
    });
    const colorSetsByType: ColorSetDefinition[] = await getColorSetsByType(type);
    set({
      colorSetsByType,
      isColorSetsByTypeLoading: false,
    });
    return colorSetsByType;
  },
  saveColorSet: async (
    colorSetDef: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    setActiveTabKey?: boolean
  ): Promise<ColorSetDefinition> => {
    const {colorSetsByType, auth} = get();
    await saveColorSet(colorSetDef);
    set({
      colorSetsByType: [
        colorSetDef,
        ...colorSetsByType.filter(({id}: ColorSetDefinition) => id !== colorSetDef.id),
      ],
    });
    const colorSet: ColorSet | undefined = toColorSet(colorSetDef, brands, colors, auth?.user);
    if (colorSet) {
      await get().setColorSet(colorSet, setActiveTabKey);
    }
    return colorSetDef;
  },
  deleteColorSet: async (idToDelete?: number): Promise<void> => {
    if (idToDelete) {
      await deleteColorSet(idToDelete);
      set({
        colorSetsByType: get().colorSetsByType.filter(
          ({id}: ColorSetDefinition) => id !== idToDelete
        ),
      });
    }
  },
});
