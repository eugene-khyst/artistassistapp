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

import type {ColorSort} from '@/services/color/colors';
import {filterColorSet, sortColorSet} from '@/services/color/colors';
import type {ColorId, ColorMixture, ColorSet} from '@/services/color/types';
import {colorMixingChartWorker} from '@/services/color/worker/color-mixing-chart-worker-manager';
import type {ColorMixerSlice} from '@/stores/color-mixer-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';

export interface ColorMixingChartSlice {
  colorMixingChartSet: ColorSet | null;
  colorMixingChartMixtures: ColorMixture[][];
  isColorMixingChartLoading: boolean;

  setColorMixingChartColors: (colorIds: ColorId[], sort?: ColorSort) => Promise<void>;
  abortColorMixingChart: () => void;
}

export const createColorMixingChartSlice: StateCreator<
  ColorMixingChartSlice & ColorMixerSlice,
  [],
  [],
  ColorMixingChartSlice
> = (set, get) => {
  const colorMixingChartOperation = createAbortableOperation({
    onStart: () => {
      set({
        colorMixingChartSet: null,
        colorMixingChartMixtures: [],
        isColorMixingChartLoading: true,
      });
    },
    onFinish: () => {
      set({
        isColorMixingChartLoading: false,
      });
    },
  });

  return {
    colorMixingChartSet: null,
    colorMixingChartMixtures: [],
    isColorMixingChartLoading: false,

    setColorMixingChartColors: async (colorIds: ColorId[], sort?: ColorSort): Promise<void> => {
      get().abortColorMixingChart();
      const {colorSet} = get();
      await colorMixingChartOperation.run(async signal => {
        const colorMixingChartSet: ColorSet | null = sortColorSet(
          filterColorSet(colorSet, colorIds),
          sort
        );

        const colorMixingChartMixtures: ColorMixture[][] = await colorMixingChartWorker.run(
          worker => worker.makeColorMixingChart(colorMixingChartSet),
          signal
        );
        signal.throwIfAborted();
        set({
          colorMixingChartSet,
          colorMixingChartMixtures,
        });
      });
    },

    abortColorMixingChart: (): void => {
      colorMixingChartOperation.abort();
    },
  };
};
