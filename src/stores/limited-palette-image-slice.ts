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

import {
  type Color,
  type ColorSet,
  type ColorSetDefinition,
  CUSTOM_COLOR_SET,
  NEW_COLOR_SET,
} from '~/src/services/color/types';
import {getLimitedPaletteImage} from '~/src/services/image/worker/color-quantization-worker-manager';
import type {ColorMixerSlice} from '~/src/stores/color-mixer-slice';
import type {ColorSetSlice} from '~/src/stores/color-set-slice';
import type {TabSlice} from '~/src/stores/tab-slice';
import {TabKey} from '~/src/tabs';
import {isAbortError} from '~/src/utils/promise';

import type {OriginalImageSlice} from './original-image-slice';

export type ColorId = (string | number | null)[];

function filterColorSet(colorSet: ColorSet | null, colors: ColorId[]): ColorSet | null {
  return colorSet
    ? {
        type: colorSet.type,
        brands: colorSet.brands,
        colors: colors
          .map(([brandId, colorId]): Color | undefined =>
            colorSet.colors.find(({brand, id}: Color) => brandId === brand && colorId === id)
          )
          .filter((color): color is Color => !!color),
      }
    : null;
}

export interface LimitedPaletteImageSlice {
  limitedPaletteImage: ImageBitmap | null;
  isLimitedPaletteImageLoading: boolean;
  limitedPaletteAbortController: AbortController | null;

  setLimitedColorSet: (colorIds: ColorId[]) => Promise<void>;
  setLimitedColorSetAsMain: (colorIds: ColorId[]) => void;
  abortLimitedPalette: () => void;
}

export const createLimitedPaletteImageSlice: StateCreator<
  LimitedPaletteImageSlice & OriginalImageSlice & ColorSetSlice & ColorMixerSlice & TabSlice,
  [],
  [],
  LimitedPaletteImageSlice
> = (set, get) => ({
  limitedPaletteImage: null,
  isLimitedPaletteImageLoading: false,
  limitedPaletteAbortController: null,

  setLimitedColorSet: async (colorIds: ColorId[]): Promise<void> => {
    const {originalImageFile, colorSet, limitedPaletteImage: prev} = get();
    if (!originalImageFile) {
      return;
    }
    const limitedColorSet: ColorSet | null = filterColorSet(colorSet, colorIds);
    if (!limitedColorSet) {
      return;
    }
    try {
      const limitedPaletteAbortController = new AbortController();
      set({
        limitedPaletteImage: null,
        isLimitedPaletteImageLoading: true,
        limitedPaletteAbortController,
      });
      prev?.close();
      const limitedPaletteImage = await getLimitedPaletteImage(
        originalImageFile,
        limitedColorSet,
        limitedPaletteAbortController.signal
      );
      set({
        limitedPaletteImage,
      });
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      set({
        isLimitedPaletteImageLoading: false,
        limitedPaletteAbortController: null,
      });
    }
  },
  setLimitedColorSetAsMain: (colorIds: ColorId[]): void => {
    if (!colorIds.length) {
      return;
    }
    const {colorSet} = get();
    const limitedColorSet: ColorSet | null = filterColorSet(colorSet, colorIds);
    if (!limitedColorSet) {
      return;
    }
    const {type, brands, colors} = limitedColorSet;
    const importedColorSet: ColorSetDefinition = {
      id: NEW_COLOR_SET,
      type,
      brands: [...brands.keys()],
      standardColorSet: CUSTOM_COLOR_SET,
      colors: colors.reduce<Record<number, number[]>>((acc, {id, brand}) => {
        (acc[brand] ??= []).push(id);
        return acc;
      }, {}),
    };
    set({
      importedColorSet,
    });
    void get().setActiveTabKey(TabKey.ColorSet);
  },
  abortLimitedPalette: (): void => {
    get().limitedPaletteAbortController?.abort();
  },
});
