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
  type ColorId,
  type ColorSet,
  type ColorSetDefinition,
  CUSTOM_COLOR_SET,
  filterColorSet,
  NEW_COLOR_SET,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {transfer} from 'comlink';
import type {StateCreator} from 'zustand';

import {colorQuantizationWorker} from '@/services/image/worker/color-quantization-worker-manager';
import type {ColorMixerSlice} from '@/stores/color-mixer-slice';
import type {ColorSetSlice} from '@/stores/color-set-slice';
import type {TabSlice} from '@/stores/tab-slice';
import {TabKey} from '@/tabs';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {IMAGE_SIZE, ResizeImage, resizeImageBitmap} from '@/utils/graphics';

import {type OriginalImageSlice, registerProcessedImage} from './original-image-slice';

export interface LimitedPaletteImageSlice {
  limitedColorSet: ColorSet | null;
  limitedPaletteImage: ImageBitmap | null;
  isLimitedPaletteImageLoading: boolean;

  setLimitedColorSet: (colorIds: ColorId[]) => Promise<void>;
  setLimitedColorSetAsMain: () => Promise<void>;
  clearLimitedPalette: () => void;
  abortLimitedPalette: () => void;
  clearLimitedPaletteImage: () => void;
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
        limitedColorSet: null,
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
      get().clearLimitedPalette();
    },
  });

  return {
    limitedColorSet: null,
    limitedPaletteImage: null,
    isLimitedPaletteImageLoading: false,

    setLimitedColorSet: async (colorIds: ColorId[]): Promise<void> => {
      get().abortLimitedPalette();
      const {originalImage, colorSet, limitedPaletteImage: prev} = get();
      if (!originalImage) {
        return;
      }
      const limitedColorSet: ColorSet | null = filterColorSet(colorSet, colorIds);
      if (!limitedColorSet?.colors.length) {
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
          limitedColorSet,
          limitedPaletteImage: quantizedImage,
        });
      });
    },

    setLimitedColorSetAsMain: async (): Promise<void> => {
      const {limitedColorSet} = get();
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

    clearLimitedPalette: (): void => {
      get().abortLimitedPalette();
      get().clearLimitedPaletteImage();
      if (!get().limitedColorSet) {
        return;
      }
      set({
        limitedColorSet: null,
      });
    },

    abortLimitedPalette: (): void => {
      limitedPaletteOperation.abort();
    },

    clearLimitedPaletteImage: (): void => {
      const {limitedPaletteImage} = get();
      if (!limitedPaletteImage) {
        return;
      }
      set({
        limitedPaletteImage: null,
      });
      limitedPaletteImage.close();
    },
  };
};
