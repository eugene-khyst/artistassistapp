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
  type ColorMixture,
  type ColorSet,
  type ColorSort,
  filterColorSet,
  sortColorSet,
} from '@eugene-khyst/artistassistapp-color-mixer';
import type {StateCreator} from 'zustand';

import {colorMixingChartWorker} from '@/services/color/worker/color-mixing-chart-worker-manager';
import type {ColorMixerSlice} from '@/stores/color-mixer-slice';
import {createAbortableOperation} from '@/utils/abortable-operation';

export interface ColorMixingChartSlice {
  colorMixingChartSet: ColorSet | null;
  colorMixingChartMixtures: ColorMixture[][];
  isColorMixingChartLoading: boolean;

  setColorMixingChartColors: (colorIds: ColorId[], sort?: ColorSort) => Promise<void>;
  clearColorMixingChart: () => void;
  abortColorMixingChart: () => void;
}

type ColorMixingChartSliceDependencies = Pick<ColorMixerSlice, 'colorSet'>;

export const createColorMixingChartSlice: StateCreator<
  ColorMixingChartSlice & ColorMixingChartSliceDependencies,
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

    clearColorMixingChart: (): void => {
      get().abortColorMixingChart();
      const {colorMixingChartSet, colorMixingChartMixtures} = get();
      if (!colorMixingChartSet && !colorMixingChartMixtures.length) {
        return;
      }
      set({
        colorMixingChartSet: null,
        colorMixingChartMixtures: [],
      });
    },

    abortColorMixingChart: (): void => {
      colorMixingChartOperation.abort();
    },
  };
};
