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

import {transfer} from 'comlink';
import type {StateCreator} from 'zustand';

import {filterColorSet} from '@/services/color/colors';
import type {ColorId, ColorSet, ColorSetDefinition} from '@/services/color/types';
import {CUSTOM_COLOR_SET, NEW_COLOR_SET} from '@/services/color/types';
import {colorQuantizationWorker} from '@/services/image/worker/color-quantization-worker-manager';
import type {ColorMixerSlice} from '@/stores/color-mixer-slice';
import type {ColorSetSlice} from '@/stores/color-set-slice';
import type {TabSlice} from '@/stores/tab-slice';
import {TabKey} from '@/tabs';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {IMAGE_SIZE, ResizeImage, resizeImageBitmap} from '@/utils/graphics';

import {type OriginalImageSlice, registerProcessedImage} from './original-image-slice';

export interface LimitedPaletteImageSlice {
  limitedPaletteImage: ImageBitmap | null;
  isLimitedPaletteImageLoading: boolean;

  setLimitedColorSet: (colorIds: ColorId[]) => Promise<void>;
  setLimitedColorSetAsMain: (colorIds: ColorId[]) => Promise<void>;
  abortLimitedPalette: () => void;
}

type LimitedPaletteImageSliceDependencies = Pick<OriginalImageSlice, 'originalImage'> &
  Pick<ColorMixerSlice, 'colorSet'> &
  Pick<ColorSetSlice, 'saveColorSet' | 'loadColorSets'> &
  Pick<TabSlice, 'setActiveTabKey'>;

export const createLimitedPaletteImageSlice: StateCreator<
  LimitedPaletteImageSlice & LimitedPaletteImageSliceDependencies,
  [],
  [],
  LimitedPaletteImageSlice
> = (set, get) => {
  const limitedPaletteOperation = createAbortableOperation({
    onStart: () => {
      set({
        limitedPaletteImage: null,
        isLimitedPaletteImageLoading: true,
      });
    },
    onFinish: () => {
      set({
        isLimitedPaletteImageLoading: false,
      });
    },
  });

  registerProcessedImage({
    abort: () => {
      limitedPaletteOperation.abort();
    },
    clear: () => {
      const {limitedPaletteImage} = get();
      set({limitedPaletteImage: null});
      limitedPaletteImage?.close();
    },
  });

  return {
    limitedPaletteImage: null,
    isLimitedPaletteImageLoading: false,

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
      await limitedPaletteOperation.run(async signal => {
        prev?.close();
        const resizedImage = await resizeImageBitmap(
          originalImage,
          ResizeImage.resizeToPixelCount(IMAGE_SIZE.SD)
        );
        const {quantizedImage} = await colorQuantizationWorker.run(
          worker =>
            worker.getLimitedPaletteImage(transfer(resizedImage, [resizedImage]), limitedColorSet),
          signal
        );
        if (signal.aborted) {
          quantizedImage.close();
        }
        signal.throwIfAborted();
        set({
          limitedPaletteImage: quantizedImage,
        });
      });
    },

    setLimitedColorSetAsMain: async (colorIds: ColorId[]): Promise<void> => {
      if (!colorIds.length) {
        return;
      }
      const {colorSet} = get();
      const limitedColorSet: ColorSet | null = filterColorSet(colorSet, colorIds);
      if (!limitedColorSet) {
        return;
      }
      const {type, brands, colors} = limitedColorSet;
      const colorSetDefinition: ColorSetDefinition = {
        id: NEW_COLOR_SET,
        type,
        brands: [...brands.keys()],
        standardColorSet: CUSTOM_COLOR_SET,
        colors: colors.reduce<Record<number, number[]>>((acc, {id, brand}) => {
          (acc[brand] ??= []).push(id);
          return acc;
        }, {}),
      };
      await get().saveColorSet(colorSetDefinition);
      await get().loadColorSets();
      void get().setActiveTabKey(TabKey.ColorSet);
    },

    abortLimitedPalette: (): void => {
      limitedPaletteOperation.abort();
    },
  };
};
