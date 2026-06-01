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

import {ZoomableImageCanvas} from '@/services/canvas/image/zoomable-image-canvas';
import {hexToRgb, type RgbTuple} from '@/services/color/space/rgb';
import type {ColorId, ColorSet, SamplingArea, SimilarColor} from '@/services/color/types';
import {colorMixer} from '@/services/color/worker/color-mixer-worker-manager';
import {mergeSimilarSamplingPoints, type SamplingPoint} from '@/services/image/sampling-point';
import {colorQuantizationWorker} from '@/services/image/worker/color-quantization-worker-manager';
import type {AppSlice} from '@/stores/app-slice';
import type {PaletteSlice, SaveToPaletteEntry} from '@/stores/palette-slice';
import {TabKey} from '@/tabs';
import {IMAGE_SIZE, ResizeImage, resizeImageBitmap} from '@/utils/graphics';
import {clamp} from '@/utils/math-utils';
import {abortablePromise, createAbortError, isAbortError} from '@/utils/promise';

import type {OriginalImageSlice} from './original-image-slice';
import type {TabSlice} from './tab-slice';

interface SamplingPointWithSimilarColor extends SamplingPoint {
  similarColor: SimilarColor;
}

async function findSimilarColors(
  targetColorHex: string | null,
  includeTransparentLayers: boolean,
  motherColorId?: ColorId | null
): Promise<SimilarColor[]> {
  if (!targetColorHex) {
    return [];
  }
  return colorMixer.findSimilarColors(
    hexToRgb(targetColorHex),
    includeTransparentLayers,
    motherColorId
  );
}

export interface ColorMixerSlice {
  colorSet: ColorSet | null;
  underlayerHex: string | null;
  isColorMixerLoading: boolean;
  motherColorId: ColorId | null;
  targetColorHex: string | null;
  samplingArea: SamplingArea | null;
  colorPickerPipette: SamplingArea | null;
  similarColors: SimilarColor[];
  isSimilarColorsLoading: boolean;
  isBuildPaletteLoading: boolean;
  buildPaletteAbortController: AbortController | null;

  setColorSet: (colorSet: ColorSet, options?: {setActiveTabKey?: boolean}) => Promise<void>;
  setUnderlayer: (underlayerHex: string | null) => Promise<void>;
  setSurface: (surfaceHex: string) => Promise<void>;
  setLayeringEnabled: (layeringEnabled: boolean) => Promise<void>;
  setMotherColor: (motherColorId: ColorId | null) => Promise<void>;
  setTargetColor: (
    targetColorHex: string | null,
    samplingArea: SamplingArea | null
  ) => Promise<void>;
  setColorPickerPipette: (colorPickerPipette: SamplingArea | null) => void;
  buildPalette: () => Promise<void>;
  abortBuildPalette: () => void;
}

export const createColorMixerSlice: StateCreator<
  ColorMixerSlice & AppSlice & TabSlice & OriginalImageSlice & PaletteSlice,
  [],
  [],
  ColorMixerSlice
> = (set, get) => ({
  colorSet: null,
  isColorMixerLoading: false,
  underlayerHex: null,
  motherColorId: null,
  targetColorHex: null,
  samplingArea: null,
  colorPickerPipette: null,
  similarColors: [],
  isSimilarColorsLoading: false,
  isBuildPaletteLoading: false,
  buildPaletteAbortController: null,

  setColorSet: async (
    colorSet: ColorSet,
    {setActiveTabKey = true}: {setActiveTabKey?: boolean} = {}
  ): Promise<void> => {
    const {
      imageFile,
      targetColorHex,
      samplingArea,
      appSettings: {colorPickerSurfaceHex},
    } = get();
    if (setActiveTabKey) {
      const activeTabKey = imageFile ? TabKey.ColorPicker : TabKey.Photo;
      await get().setActiveTabKey(activeTabKey);
    }
    set({
      isColorMixerLoading: true,
      colorSet,
      underlayerHex: null,
      motherColorId: null,
      similarColors: [],
    });
    try {
      await colorMixer.setColorSet(colorSet, null, hexToRgb(colorPickerSurfaceHex));
    } finally {
      set({
        isColorMixerLoading: false,
      });
    }
    await get().setTargetColor(targetColorHex, samplingArea);
  },

  setUnderlayer: async (underlayerHex: string | null): Promise<void> => {
    const {
      targetColorHex,
      motherColorId,
      appSettings: {colorPickerLayeringEnabled},
    } = get();
    set({
      isColorMixerLoading: true,
      underlayerHex,
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    try {
      await colorMixer.setUnderlayer(underlayerHex ? hexToRgb(underlayerHex) : null);
      const similarColors: SimilarColor[] = await findSimilarColors(
        targetColorHex,
        colorPickerLayeringEnabled,
        motherColorId
      );
      set({
        similarColors,
      });
    } finally {
      set({
        isColorMixerLoading: false,
        isSimilarColorsLoading: false,
      });
    }
  },

  setSurface: async (surfaceHex: string): Promise<void> => {
    await get().saveAppSettings({colorPickerSurfaceHex: surfaceHex});
    const {
      targetColorHex,
      motherColorId,
      appSettings: {colorPickerLayeringEnabled},
    } = get();
    set({
      isColorMixerLoading: true,
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    try {
      await colorMixer.setSurface(hexToRgb(surfaceHex));
      const similarColors: SimilarColor[] = await findSimilarColors(
        targetColorHex,
        colorPickerLayeringEnabled,
        motherColorId
      );
      set({
        similarColors,
      });
    } finally {
      set({
        isColorMixerLoading: false,
        isSimilarColorsLoading: false,
      });
    }
  },

  setLayeringEnabled: async (layeringEnabled: boolean): Promise<void> => {
    await get().saveAppSettings({colorPickerLayeringEnabled: layeringEnabled});
    const {targetColorHex, motherColorId} = get();
    set({
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    try {
      const similarColors: SimilarColor[] = await findSimilarColors(
        targetColorHex,
        layeringEnabled,
        motherColorId
      );
      set({
        similarColors,
      });
    } finally {
      set({
        isSimilarColorsLoading: false,
      });
    }
  },

  setMotherColor: async (motherColorId: ColorId | null): Promise<void> => {
    const {
      targetColorHex,
      appSettings: {colorPickerLayeringEnabled},
    } = get();
    set({
      motherColorId,
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    try {
      const similarColors: SimilarColor[] = await findSimilarColors(
        targetColorHex,
        colorPickerLayeringEnabled,
        motherColorId
      );
      set({
        similarColors,
      });
    } finally {
      set({
        isSimilarColorsLoading: false,
      });
    }
  },

  setTargetColor: async (
    targetColorHex: string | null,
    samplingArea: SamplingArea | null
  ): Promise<void> => {
    const {
      motherColorId,
      appSettings: {colorPickerLayeringEnabled},
    } = get();
    set({
      targetColorHex,
      samplingArea,
      colorPickerPipette: null,
      similarColors: [],
      selectedPaletteColorMixtures: new Map(),
      isSimilarColorsLoading: true,
    });
    try {
      const similarColors: SimilarColor[] = await findSimilarColors(
        targetColorHex,
        colorPickerLayeringEnabled,
        motherColorId
      );
      set({
        similarColors,
      });
    } finally {
      set({
        isSimilarColorsLoading: false,
      });
    }
  },

  setColorPickerPipette: (colorPickerPipette: SamplingArea | null): void => {
    set({
      colorPickerPipette,
    });
  },

  buildPalette: async (): Promise<void> => {
    get().abortBuildPalette();
    const {
      originalImage,
      motherColorId,
      appSettings: {colorPickerLayeringEnabled},
    } = get();
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
      const resizedImage = await resizeImageBitmap(
        originalImage,
        ResizeImage.resizeToPixelCount(IMAGE_SIZE.SD)
      );
      const {width: resizeWidth, height: resizeHeight} = resizedImage;
      const {width: origWidth, height: origHeight} = originalImage;
      const rawPoints: SamplingPoint[] = (
        await colorQuantizationWorker.run(
          worker => worker.getSamplingPoints(transfer(resizedImage, [resizedImage])),
          signal
        )
      ).map(({x, y, ...rest}) => ({
        x: clamp(Math.round(x / (resizeWidth / origWidth)), 0, origWidth - 1),
        y: clamp(Math.round(y / (resizeHeight / origHeight)), 0, origHeight - 1),
        ...rest,
      }));

      const targetColors: RgbTuple[] = rawPoints.map(({rgb}) => rgb);
      const similarColors: (SimilarColor | undefined)[] = await abortablePromise(
        colorMixer.findSimilarColorBulk(targetColors, colorPickerLayeringEnabled, motherColorId),
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
      if (isAbortError(error)) {
        return;
      }
      throw error;
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
