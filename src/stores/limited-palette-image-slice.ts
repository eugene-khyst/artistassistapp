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

import {filterColorSet} from '~/src/services/color/colors';
import type {ColorId, ColorSet, ColorSetDefinition} from '~/src/services/color/types';
import {CUSTOM_COLOR_SET, NEW_COLOR_SET} from '~/src/services/color/types';
import {colorQuantizationWorker} from '~/src/services/image/worker/color-quantization-worker-manager';
import type {ColorMixerSlice} from '~/src/stores/color-mixer-slice';
import type {ColorSetSlice} from '~/src/stores/color-set-slice';
import type {TabSlice} from '~/src/stores/tab-slice';
import {TabKey} from '~/src/tabs';
import {isAbortError} from '~/src/utils/promise';

import type {OriginalImageSlice} from './original-image-slice';

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
    get().abortLimitedPalette();
    const {originalImage, colorSet, limitedPaletteImage: prev} = get();
    if (!originalImage) {
      return;
    }
    const limitedColorSet: ColorSet | null = filterColorSet(colorSet, colorIds);
    if (!limitedColorSet) {
      return;
    }
    const limitedPaletteAbortController = new AbortController();
    set({
      limitedPaletteImage: null,
      isLimitedPaletteImageLoading: true,
      limitedPaletteAbortController,
    });
    try {
      prev?.close();
      const {quantizedImage} = await colorQuantizationWorker.run(
        worker => worker.getLimitedPaletteImage(originalImage, limitedColorSet),
        limitedPaletteAbortController.signal
      );
      set({
        limitedPaletteImage: quantizedImage,
      });
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      if (get().limitedPaletteAbortController === limitedPaletteAbortController) {
        set({
          isLimitedPaletteImageLoading: false,
          limitedPaletteAbortController: null,
        });
      }
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
