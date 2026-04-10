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

import {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {PAPER_WHITE, PAPER_WHITE_HEX} from '~/src/services/color/color-mixer';
import {hexToRgb, type RgbTuple} from '~/src/services/color/space/rgb';
import type {ColorSet, SamplingArea, SimilarColor} from '~/src/services/color/types';
import {colorMixer} from '~/src/services/color/worker/color-mixer-worker-manager';
import {mergeSimilarSamplingPoints, type SamplingPoint} from '~/src/services/image/sampling-point';
import {colorQuantizationWorker} from '~/src/services/image/worker/color-quantization-worker-manager';
import type {PaletteSlice, SaveToPaletteEntry} from '~/src/stores/palette-slice';
import {TabKey} from '~/src/tabs';
import {abortablePromise, createAbortError, isAbortError} from '~/src/utils/promise';

import type {OriginalImageSlice} from './original-image-slice';
import type {TabSlice} from './tab-slice';

interface SamplingPointWithSimilarColor extends SamplingPoint {
  similarColor: SimilarColor;
}

export interface ColorMixerSlice {
  colorSet: ColorSet | null;
  isColorMixerSetLoading: boolean;
  backgroundColor: string | null;
  isColorMixerBackgroundLoading: boolean;
  targetColor: string;
  samplingArea: SamplingArea | null;
  colorPickerPipette: SamplingArea | null;
  similarColors: SimilarColor[];
  isSimilarColorsLoading: boolean;
  isBuildPaletteLoading: boolean;
  buildPaletteAbortController: AbortController | null;

  setColorSet: (colorSet: ColorSet, setActiveTabKey?: boolean) => Promise<void>;
  setBackgroundColor: (backgroundColor: string) => Promise<void>;
  setTargetColor: (color: string, samplingArea: SamplingArea | null) => Promise<void>;
  setColorPickerPipette: (colorPickerPipette: SamplingArea | null) => void;
  buildPalette: () => Promise<void>;
  abortBuildPalette: () => void;
}

export const createColorMixerSlice: StateCreator<
  ColorMixerSlice & TabSlice & OriginalImageSlice & PaletteSlice,
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
  colorPickerPipette: null,
  similarColors: [],
  isSimilarColorsLoading: false,
  isBuildPaletteLoading: false,
  buildPaletteAbortController: null,

  setColorSet: async (colorSet: ColorSet, setActiveTabKey = true): Promise<void> => {
    const {imageFile, targetColor, samplingArea} = get();
    if (setActiveTabKey) {
      const activeTabKey = imageFile ? TabKey.ColorPicker : TabKey.Photo;
      await get().setActiveTabKey(activeTabKey);
    }
    set({
      colorSet,
      isColorMixerSetLoading: true,
      backgroundColor: PAPER_WHITE_HEX,
      similarColors: [],
    });
    await colorMixer.setColorSet(colorSet, PAPER_WHITE);
    set({
      isColorMixerSetLoading: false,
    });
    await get().setTargetColor(targetColor, samplingArea);
  },
  setBackgroundColor: async (backgroundColor: string): Promise<void> => {
    const {targetColor} = get();
    set({
      isColorMixerBackgroundLoading: true,
      backgroundColor,
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    await colorMixer.setBackgroundColor(hexToRgb(backgroundColor));
    set({
      isColorMixerBackgroundLoading: false,
      similarColors: await colorMixer.findSimilarColors(hexToRgb(targetColor)),
      isSimilarColorsLoading: false,
    });
  },
  setTargetColor: async (targetColor: string, samplingArea: SamplingArea | null): Promise<void> => {
    set({
      targetColor,
      samplingArea,
      colorPickerPipette: null,
      similarColors: [],
      selectedPaletteColorMixtures: new Map(),
      isSimilarColorsLoading: true,
    });
    set({
      similarColors: await colorMixer.findSimilarColors(hexToRgb(targetColor)),
      isSimilarColorsLoading: false,
    });
  },
  setColorPickerPipette: (colorPickerPipette: SamplingArea | null): void => {
    set({
      colorPickerPipette,
    });
  },
  buildPalette: async (): Promise<void> => {
    get().abortBuildPalette();
    const {originalImage} = get();
    if (!originalImage) {
      return;
    }
    const buildPaletteAbortController = new AbortController();
    const {signal} = buildPaletteAbortController;
    set({
      isBuildPaletteLoading: true,
      buildPaletteAbortController,
    });
    try {
      const rawPoints: SamplingPoint[] = await colorQuantizationWorker.run(
        worker => worker.getSamplingPoints(originalImage),
        signal
      );

      const targetColors: RgbTuple[] = rawPoints.map(({rgb}) => rgb);
      const similarColors: (SimilarColor | undefined)[] = await abortablePromise(
        colorMixer.findSimilarColorBulk(targetColors),
        signal
      );

      // Replace image RGB with matched paint RGB for perceptual merging.
      const paintPoints: SamplingPointWithSimilarColor[] = [];
      for (const [index, samplingPoint] of rawPoints.entries()) {
        const similarColor = similarColors[index];
        if (!similarColor) {
          continue;
        }
        const paintPoint: SamplingPointWithSimilarColor = {
          ...samplingPoint,
          rgb: similarColor.colorMixture.layerRgb,
          similarColor,
        };
        paintPoints.push(paintPoint);
      }

      const mergedPoints: SamplingPointWithSimilarColor[] = mergeSimilarSamplingPoints(paintPoints);

      const {center} = ZoomableImageCanvas.imageDimension(originalImage);
      const paletteEntries: SaveToPaletteEntry[] = [];
      for (const {
        x,
        y,
        similarColor: {colorMixture},
      } of mergedPoints) {
        if (signal.aborted) {
          throw createAbortError();
        }
        paletteEntries.push({
          colorMixture,
          samplingArea: {
            x: x - center.x,
            y: y - center.y,
            diameter: 1,
          },
        });
      }
      await get().saveToPaletteBulk(paletteEntries, signal);
    } catch (error) {
      if (!isAbortError(error)) {
        throw error;
      }
    } finally {
      if (get().buildPaletteAbortController === buildPaletteAbortController) {
        set({
          isBuildPaletteLoading: false,
          buildPaletteAbortController: null,
        });
      }
    }
  },
  abortBuildPalette: (): void => {
    get().buildPaletteAbortController?.abort();
  },
});
