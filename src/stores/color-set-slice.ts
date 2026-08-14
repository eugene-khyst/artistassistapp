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

import {
  type ColorBrandDefinition,
  type ColorDefinition,
  type ColorSet,
  type ColorSetDefinition,
  type ColorType,
  compareColorSetsByDate,
  indexById,
  reverseOrder,
} from '@eugene-khyst/artistassistapp-color-mixer';
import type {StateCreator} from 'zustand';

import {ForceLogoutError} from '@/services/auth/errors';
import {fetchColorBrands, fetchColorsBulk} from '@/services/color/color-queries';
import {toColorSet} from '@/services/color/colors';
import {deleteColorSet, getAllColorSets, saveColorSets} from '@/services/db/color-set-db';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import {persistChange} from '@/stores/sync/persist-change';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {groupBy, maxOf} from '@/utils/array';

import type {ColorMixerSlice} from './color-mixer-slice';

export interface ColorSetSlice {
  colorSets: Map<ColorType, ColorSetDefinition[]>;
  // Bumped only when color sets are reloaded from IDB (init, cloud download, cross-tab wake).
  colorSetsReloadRevision: number;

  isColorSetsLoading: boolean;
  isColorSetActivationLoading: boolean;
  colorSetActivationError: unknown;

  getLatestColorSet: () => ColorSetDefinition | undefined;
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
  Pick<AuthSlice, 'auth' | 'logout'>;

export const createColorSetSlice: StateCreator<
  ColorSetSlice & ColorSetSliceDependencies,
  [],
  [],
  ColorSetSlice
> = (set, get) => {
  const activateColorSetOperation = createAbortableOperation({
    onStart: () => {
      set({
        isColorSetActivationLoading: true,
        colorSetActivationError: null,
      });
    },
    onFinish: () => {
      set({
        isColorSetActivationLoading: false,
      });
    },
  });

  return {
    colorSets: new Map(),
    colorSetsReloadRevision: 0,

    isColorSetsLoading: false,
    isColorSetActivationLoading: false,
    colorSetActivationError: null,

    getLatestColorSet: (): ColorSetDefinition | undefined =>
      maxOf([...get().colorSets.values()].flat(), compareColorSetsByDate),

    loadColorSets: async (): Promise<void> => {
      try {
        set({
          isColorSetsLoading: true,
        });
        const colorSets = (await getAllColorSets()).sort(reverseOrder(compareColorSetsByDate));
        set(prev => ({
          colorSets: groupBy(colorSets, ({type}) => type),
          colorSetsReloadRevision: prev.colorSetsReloadRevision + 1,
        }));
      } finally {
        set({
          isColorSetsLoading: false,
        });
      }
      // Not awaited: activation fetches color data and must not block startup or a store reload.
      void get().activateLatestColorSet();
    },

    activateLatestColorSet: async (): Promise<void> => {
      try {
        await activateColorSetOperation.run(async (signal: AbortSignal) => {
          const latestColorSet = get().getLatestColorSet();
          let colorSet: ColorSet | null = null;
          if (latestColorSet?.type && latestColorSet.brands) {
            const {type, brands: brandIds} = latestColorSet;
            const {auth} = get();
            const brands = indexById(await fetchColorBrands(type, signal));
            const brandAliases = brandIds
              .map(id => brands.get(id)?.alias)
              .filter((alias): alias is string => !!alias);
            const colors = await fetchColorsBulk(type, brandAliases, auth, signal);
            // An in-form save replaces the latest color set without bumping the reload revision.
            if (signal.aborted || get().getLatestColorSet() !== latestColorSet) {
              return;
            }
            colorSet = toColorSet(latestColorSet, brands, colors, auth?.user);
          }
          await get().setColorSet(colorSet, {setActiveTabKey: false});
        });
      } catch (error) {
        if (error instanceof ForceLogoutError) {
          void get().logout(error.type);
          return;
        }
        set({
          colorSetActivationError: error,
        });
      }
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
        return;
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
        ...(colorSets.get(type!)?.filter(({id}: ColorSetDefinition) => id !== colorSetDef.id) ??
          []),
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
  };
};
