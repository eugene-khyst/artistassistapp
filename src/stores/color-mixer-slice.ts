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

import type {Remote} from 'comlink';
import {wrap} from 'comlink';
import type {StateCreator} from 'zustand';

import type {ColorMixer} from '~/src/services/color/color-mixer';
import {PAPER_WHITE_HEX} from '~/src/services/color/color-mixer';
import {Rgb, type RgbTuple} from '~/src/services/color/space/rgb';
import type {ColorSet, SamplingArea, SimilarColor} from '~/src/services/color/types';
import {TabKey} from '~/src/tabs';

import type {OriginalImageSlice} from './original-image-slice';
import type {TabSlice} from './tab-slice';

const colorMixer: Remote<ColorMixer> = wrap(
  new Worker(new URL('../services/color/worker/color-mixer-worker.ts', import.meta.url), {
    type: 'module',
  })
);

export interface ColorMixerSlice {
  colorSet: ColorSet | null;
  isColorMixerSetLoading: boolean;
  backgroundColor: string;
  isColorMixerBackgroundLoading: boolean;
  targetColor: string;
  samplingArea: SamplingArea | null;
  colorPickerPipet: SamplingArea | null;
  similarColors: SimilarColor[];
  isSimilarColorsLoading: boolean;

  setColorSet: (colorSet: ColorSet, setActiveTabKey?: boolean) => Promise<void>;
  setBackgroundColor: (backgroundColor: string | RgbTuple) => Promise<void>;
  setTargetColor: (color: string, samplingArea: SamplingArea | null) => Promise<void>;
  setColorPickerPipet: (colorPickerPipet: SamplingArea | null) => void;
}

export const createColorMixerSlice: StateCreator<
  ColorMixerSlice & TabSlice & OriginalImageSlice,
  [],
  [],
  ColorMixerSlice
> = (set, get) => ({
  colorSet: null,
  isColorMixerSetLoading: false,
  backgroundColor: PAPER_WHITE_HEX,
  isColorMixerBackgroundLoading: false,
  targetColor: PAPER_WHITE_HEX,
  samplingArea: null,
  colorPickerPipet: null,
  similarColors: [],
  isSimilarColorsLoading: false,

  setColorSet: async (colorSet: ColorSet, setActiveTabKey = true): Promise<void> => {
    if (setActiveTabKey) {
      const activeTabKey = !get().imageFile ? TabKey.Photo : TabKey.ColorPicker;
      await get().setActiveTabKey(activeTabKey);
    }
    set({
      colorSet,
      isColorMixerSetLoading: true,
      backgroundColor: PAPER_WHITE_HEX,
      similarColors: [],
    });
    await colorMixer.setColorSet(colorSet, PAPER_WHITE_HEX);
    set({
      isColorMixerSetLoading: false,
    });
    await get().setTargetColor(get().targetColor, get().samplingArea);
  },
  setBackgroundColor: async (backgroundColor: string | RgbTuple): Promise<void> => {
    set({
      isColorMixerBackgroundLoading: true,
      backgroundColor: Rgb.fromHexOrTuple(backgroundColor).toHex(),
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    await colorMixer.setBackgroundColor(backgroundColor);
    set({
      isColorMixerBackgroundLoading: false,
      similarColors: await colorMixer.findSimilarColors(get().targetColor),
      isSimilarColorsLoading: false,
    });
  },
  setTargetColor: async (targetColor: string, samplingArea: SamplingArea | null): Promise<void> => {
    set({
      targetColor,
      samplingArea,
      colorPickerPipet: null,
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    set({
      similarColors: await colorMixer.findSimilarColors(targetColor),
      isSimilarColorsLoading: false,
    });
  },
  setColorPickerPipet: (colorPickerPipet: SamplingArea | null): void => {
    set({colorPickerPipet});
  },
});
