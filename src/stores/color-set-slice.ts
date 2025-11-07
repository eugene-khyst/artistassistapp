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

import dayjs from 'dayjs';
import {saveAs} from 'file-saver';
import type {StateCreator} from 'zustand';

import {fetchColorBrands, fetchColorsBulk, toColorSet} from '~/src/services/color/colors';
import {
  type ColorBrandDefinition,
  type ColorDefinition,
  type ColorSet,
  type ColorSetDefinition,
  type ColorType,
  FileExtension,
} from '~/src/services/color/types';
import {
  deleteColorSet,
  getColorSets,
  getLastColorSet,
  saveColorSets,
} from '~/src/services/db/color-set-db';
import type {AuthSlice} from '~/src/stores/auth-slice';
import type {InitSlice} from '~/src/stores/init-slice';
import {groupBy} from '~/src/utils/array';
import {compareByDate, compareById, reverseOrder} from '~/src/utils/comparator';
import {digestMessage} from '~/src/utils/digest';

import type {ColorMixerSlice} from './color-mixer-slice';

const DATE_TIME_FORMAT = 'YYYYMMDD_HHmm';

function removeDate(colorSets: ColorSetDefinition[]): ColorSetDefinition[] {
  return colorSets.map(({date: _, ...colorSet}: ColorSetDefinition) => colorSet);
}

export interface ColorSetSlice {
  importedColorSet: ColorSetDefinition | null;
  latestColorSet: ColorSetDefinition | null;
  colorSets: Map<ColorType, ColorSetDefinition[]>;

  isColorSetsLoading: boolean;

  loadColorSets: (importedColorSet?: ColorSetDefinition) => Promise<void>;
  saveColorSet: (
    colorSet: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    setActiveTabKey?: boolean
  ) => Promise<ColorSetDefinition>;
  loadColorSetsFromJson: (file: File) => Promise<ColorSetDefinition | undefined>;
  saveColorSetsAsJson: () => Promise<string | undefined>;
  deleteColorSet: (
    type?: ColorType,
    idToDelete?: number
  ) => Promise<ColorSetDefinition | undefined>;
}

export const createColorSetSlice: StateCreator<
  ColorSetSlice & InitSlice & ColorMixerSlice & AuthSlice,
  [],
  [],
  ColorSetSlice
> = (set, get) => ({
  importedColorSet: null,
  latestColorSet: null,
  colorSets: new Map(),

  isColorSetsLoading: false,

  loadColorSets: async (importedColorSet?: ColorSetDefinition): Promise<void> => {
    set({
      isColorSetsLoading: true,
    });

    const colorSets: Map<ColorType, ColorSetDefinition[]> = groupBy(
      await getColorSets(),
      ({type}: ColorSetDefinition) => type
    );
    for (const colorSetsByType of colorSets.values()) {
      colorSetsByType.sort(reverseOrder(compareByDate));
    }

    const latestColorSet: ColorSetDefinition | null =
      (!importedColorSet && (await getLastColorSet())) || null;

    if (latestColorSet) {
      const {auth} = get();
      const {type, brands: brandIds} = latestColorSet;
      if (!type || !brandIds) {
        return;
      }

      const brands = await fetchColorBrands(type);
      const brandAliases = brandIds
        .map((id: number): string | undefined => brands.get(id)?.alias)
        .filter((alias): alias is string => !!alias);
      const colors: Map<string, Map<number, ColorDefinition>> = await fetchColorsBulk(
        type,
        brandAliases
      );
      const colorSet = toColorSet(latestColorSet, brands, colors, auth?.user);
      if (colorSet) {
        void get().setColorSet(colorSet, false);
      }
    }

    set({
      colorSets,
      importedColorSet,
      latestColorSet,
      isColorSetsLoading: false,
    });
  },
  saveColorSet: async (
    colorSetDef: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>,
    setActiveTabKey?: boolean
  ): Promise<ColorSetDefinition> => {
    const {colorSets: prevColorSets, auth} = get();
    const {id, ...colorSetDefWithoutId} = colorSetDef;
    colorSetDef = {
      ...colorSetDefWithoutId,
      ...(id ? {id} : {}),
    };
    await saveColorSets([colorSetDef]);
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
    const colorSet: ColorSet | undefined = toColorSet(colorSetDef, brands, colors, auth?.user);
    if (colorSet) {
      void get().setColorSet(colorSet, setActiveTabKey);
    }
    return colorSetDef;
  },
  loadColorSetsFromJson: async (file: File): Promise<ColorSetDefinition | undefined> => {
    try {
      const json: string = await file.text();
      const colorSets = JSON.parse(json) as ColorSetDefinition[];
      await saveColorSets(colorSets);
      colorSets.sort(reverseOrder(compareByDate));
      set({
        colorSets: groupBy(colorSets, ({type}: ColorSetDefinition) => type),
      });
      const hash: string = await digestMessage(json);
      void get().saveAppSettings({
        latestColorSetsJsonHash: hash,
      });
      const [latestColorSet] = colorSets;
      return latestColorSet;
    } catch (e) {
      console.error(e);
    }
    return;
  },
  saveColorSetsAsJson: async (): Promise<string | undefined> => {
    const {
      appSettings: {autoSavingColorSetsJson},
      colorSets,
    } = get();
    if (!autoSavingColorSetsJson || !colorSets.size) {
      return;
    }
    const colorSetsArr: ColorSetDefinition[] = removeDate(
      [...colorSets.values()].flat().sort(compareById)
    );
    const json: string = JSON.stringify(colorSetsArr, null, 2);
    const hash: string = await digestMessage(json);
    const {latestColorSetsJsonHash} = get().appSettings;
    if (hash === latestColorSetsJsonHash) {
      return;
    }
    const dateTime = dayjs().format(DATE_TIME_FORMAT);
    const filename = `Color-Sets-${dateTime}${FileExtension.ColorSet}`;
    saveAs(new Blob([json], {type: 'application/json'}), filename);
    void get().saveAppSettings({
      latestColorSetsJsonHash: hash,
    });
    return filename;
  },
  deleteColorSet: async (
    type?: ColorType,
    idToDelete?: number
  ): Promise<ColorSetDefinition | undefined> => {
    if (!type || !idToDelete) {
      return;
    }
    const {colorSets: prevColorSets} = get();
    await deleteColorSet(idToDelete);
    const colorSets = new Map<ColorType, ColorSetDefinition[]>(prevColorSets);
    const colorSetsByType: ColorSetDefinition[] =
      colorSets.get(type)?.filter(({id}: ColorSetDefinition) => id !== idToDelete) ?? [];
    colorSets.set(type, colorSetsByType);
    set({
      colorSets,
    });
    const [latestColorSetByType] = [...(colorSets.get(type) ?? [])].sort(
      reverseOrder(compareByDate)
    );
    return latestColorSetByType;
  },
});
