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
import {toColorSet} from '~/src/services/color/colors';
import type {
  ColorBrandDefinition,
  ColorDefinition,
  ColorSet,
  ColorSetDefinition,
  ColorType,
} from '~/src/services/color/types';
import {deleteColorSet, getColorSetsByType, saveColorSet} from '~/src/services/db/color-set-db';

import type {ColorMixerSlice} from './color-mixer-slice';

export interface ColorSetSlice {
  colorSetsByType: ColorSetDefinition[];

  loadColorSetsByType: (type: ColorType) => Promise<ColorSetDefinition[]>;
  saveColorSet: (
    user: User | null,
    colorSetDefinition: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    setActiveTabKey?: boolean
  ) => Promise<ColorSetDefinition>;
  deleteColorSet: (idToDelete: number) => Promise<void>;
}

export const createColorSetSlice: StateCreator<
  ColorSetSlice & ColorMixerSlice,
  [],
  [],
  ColorSetSlice
> = (set, get) => ({
  colorSetsByType: [],

  loadColorSetsByType: async (type: ColorType): Promise<ColorSetDefinition[]> => {
    const colorSetsByType: ColorSetDefinition[] = await getColorSetsByType(type);
    set({colorSetsByType});
    return colorSetsByType;
  },
  saveColorSet: async (
    user: User | null,
    colorSetDef: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    setActiveTabKey?: boolean
  ): Promise<ColorSetDefinition> => {
    await saveColorSet(colorSetDef);
    set({
      colorSetsByType: [
        colorSetDef,
        ...get().colorSetsByType.filter(({id}: ColorSetDefinition) => id !== colorSetDef.id),
      ],
    });
    const colorSet: ColorSet | undefined = toColorSet(user, colorSetDef, brands, colors);
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
