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

import {fetchColorBrands, fetchColorsBulk, toColorSet} from '@/services/color/colors';
import {
  type ColorBrandDefinition,
  type ColorDefinition,
  type ColorSet,
  type ColorSetDefinition,
  type ColorType,
} from '@/services/color/types';
import {deleteColorSet, getAllColorSets, saveColorSets} from '@/services/db/color-set-db';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import {persistChange} from '@/stores/sync/persist-change';
import {groupBy, maxOf} from '@/utils/array';
import {byDate, byNumber, compare, reverseOrder} from '@/utils/comparator';
import {indexById} from '@/utils/map';

import type {ColorMixerSlice} from './color-mixer-slice';

const compareColorSetsByDate = compare<ColorSetDefinition>(
  byDate(({date}) => date),
  byNumber(({id}) => id)
);

export interface ColorSetSlice {
  colorSets: Map<ColorType, ColorSetDefinition[]>;
  // Bumped only when color sets are reloaded from IDB (init, cloud download, cross-tab wake).
  colorSetsReloadCount: number;

  isColorSetsLoading: boolean;

  loadColorSets: () => Promise<void>;
  activateLatestColorSet: () => Promise<void>;
  saveColorSet: (
    colorSet: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    options?: {setActiveTabKey?: boolean}
  ) => Promise<ColorSetDefinition | undefined>;
  deleteColorSet: (type?: ColorType, idToDelete?: number) => Promise<void>;
}

type ColorSetSliceDependencies = Pick<AppSlice, 'saveStoreChangeTokens'> &
  Pick<CloudSlice, 'pushCloudState'> &
  Pick<ColorMixerSlice, 'setColorSet'> &
  Pick<AuthSlice, 'auth'>;

export const createColorSetSlice: StateCreator<
  ColorSetSlice & ColorSetSliceDependencies,
  [],
  [],
  ColorSetSlice
> = (set, get) => ({
  colorSets: new Map(),
  colorSetsReloadCount: 0,

  isColorSetsLoading: false,

  loadColorSets: async (): Promise<void> => {
    try {
      set({
        isColorSetsLoading: true,
      });
      const colorSets = (await getAllColorSets()).sort(reverseOrder(compareColorSetsByDate));
      set({
        colorSets: groupBy(colorSets, ({type}) => type),
        colorSetsReloadCount: get().colorSetsReloadCount + 1,
      });
    } finally {
      set({
        isColorSetsLoading: false,
      });
    }
  },

  activateLatestColorSet: async (): Promise<void> => {
    const {colorSets, auth} = get();
    const latestColorSet = maxOf([...colorSets.values()].flat(), compareColorSetsByDate);
    if (!latestColorSet) {
      await get().setColorSet(null, {setActiveTabKey: false});
      return;
    }
    const {type, brands: brandIds} = latestColorSet;
    if (!type || !brandIds) {
      await get().setColorSet(null, {setActiveTabKey: false});
      return;
    }
    const brands = indexById(await fetchColorBrands(type));
    const brandAliases = brandIds
      .map((id: number): string | undefined => brands.get(id)?.alias)
      .filter((alias): alias is string => !!alias);
    const colors: Map<string, Map<number, ColorDefinition>> = await fetchColorsBulk(
      type,
      brandAliases,
      auth
    );
    const colorSet = toColorSet(latestColorSet, brands, colors, auth?.user);
    await get().setColorSet(colorSet, {setActiveTabKey: false});
  },

  saveColorSet: async (
    colorSetDef: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    {setActiveTabKey} = {}
  ): Promise<ColorSetDefinition | undefined> => {
    if (
      !Object.values(colorSetDef.colors ?? {}).some(
        (ids: number[] | undefined) => (ids?.length ?? 0) > 0
      )
    ) {
      return undefined;
    }
    const {colorSets: prevColorSets, auth} = get();
    const {id, ...colorSetDefWithoutId} = colorSetDef;
    colorSetDef = {
      ...colorSetDefWithoutId,
      ...(id ? {id} : {}),
    };
    await persistChange(get, () => saveColorSets([colorSetDef]));
    const {type} = colorSetDef;
    const colorSets = new Map<ColorType, ColorSetDefinition[]>(prevColorSets);
    const colorSetsByType: ColorSetDefinition[] = [
      colorSetDef,
      ...(colorSets.get(type!)?.filter(({id}: ColorSetDefinition) => id !== colorSetDef.id) ?? []),
    ];
    colorSets.set(type!, colorSetsByType);
    set({
      colorSets,
    });
    const colorSet: ColorSet | null = toColorSet(colorSetDef, brands, colors, auth?.user);
    if (colorSet) {
      void get().setColorSet(colorSet, {setActiveTabKey});
    }
    return colorSetDef;
  },

  deleteColorSet: async (type?: ColorType, idToDelete?: number): Promise<void> => {
    if (!type || !idToDelete) {
      return;
    }
    const {colorSets: prevColorSets} = get();
    await persistChange(get, () => deleteColorSet(idToDelete));
    const colorSets = new Map<ColorType, ColorSetDefinition[]>(prevColorSets);
    const colorSetsByType: ColorSetDefinition[] =
      colorSets.get(type)?.filter(({id}: ColorSetDefinition) => id !== idToDelete) ?? [];
    colorSets.set(type, colorSetsByType);
    set({
      colorSets,
    });
  },
});
