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
  clamp,
  type ColorId,
  type ColorMatch,
  type ColorSet,
  hexToRgb,
  includesAllColors,
  isColorSetEqual,
  type RgbTuple,
  type SamplingArea,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {transfer} from 'comlink';
import type {StateCreator} from 'zustand';

import {ZoomableImageCanvas} from '@/services/canvas/image/zoomable-image-canvas';
import {colorMixer} from '@/services/color/worker/color-mixer-worker-manager';
import {mergeSimilarSamplingPoints, type SamplingPoint} from '@/services/image/sampling-point';
import {colorQuantizationWorker} from '@/services/image/worker/color-quantization-worker-manager';
import type {AppSlice} from '@/stores/app-slice';
import type {ColorMixingChartSlice} from '@/stores/color-mixing-chart-slice';
import type {LimitedPaletteImageSlice} from '@/stores/limited-palette-image-slice';
import type {PaletteSlice, SaveToPaletteEntry} from '@/stores/palette-slice';
import {TabKey} from '@/tabs';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {IMAGE_SIZE, ResizeImage, resizeImageBitmap} from '@/utils/graphics';
import {abortablePromise} from '@/utils/promise';

import {type OriginalImageSlice, registerProcessedImage} from './original-image-slice';
import type {TabSlice} from './tab-slice';

interface ColorMixerUpdateOptions {
  persist?: boolean;
}

export interface SetColorSetOptions {
  setActiveTabKey?: boolean;
}

interface SamplingPointWithColorMatch extends SamplingPoint {
  colorMatch: ColorMatch;
}

export interface ColorMixerSlice {
  colorSet: ColorSet | null;
  underlayerHex: string | null;
  isColorMixerLoading: boolean;
  motherColorId: ColorId | null;
  targetColorHex: string | null;
  samplingArea: SamplingArea | null;
  colorPickerPipette: SamplingArea | null;
  colorMatches: ColorMatch[];
  isColorMatchesLoading: boolean;
  isBuildPaletteLoading: boolean;

  setColorSet: (colorSet: ColorSet | null, options?: SetColorSetOptions) => Promise<void>;
  setUnderlayer: (underlayerHex: string | null) => Promise<void>;
  setSurface: (surfaceHex: string, options?: ColorMixerUpdateOptions) => Promise<void>;
  setLayeringEnabled: (
    layeringEnabled: boolean,
    options?: ColorMixerUpdateOptions
  ) => Promise<void>;
  setMotherColor: (motherColorId: ColorId | null) => Promise<void>;
  setTargetColor: (
    targetColorHex: string | null,
    samplingArea: SamplingArea | null
  ) => Promise<void>;
  setColorPickerPipette: (colorPickerPipette: SamplingArea | null) => void;
  buildPalette: () => Promise<number | undefined>;
  abortBuildPalette: () => void;
}

type ColorMixerSliceDependencies = Pick<AppSlice, 'appSettings' | 'saveAppSettings'> &
  Pick<TabSlice, 'setActiveTabKey'> &
  Pick<OriginalImageSlice, 'selectedImageFile' | 'originalImage'> &
  Pick<PaletteSlice, 'selectedPaletteColorMixtures' | 'saveToPaletteBulk'> &
  Pick<ColorMixingChartSlice, 'colorMixingChartSet' | 'clearColorMixingChart'> &
  Pick<LimitedPaletteImageSlice, 'limitedColorSet' | 'clearLimitedPalette'>;

export const createColorMixerSlice: StateCreator<
  ColorMixerSlice & ColorMixerSliceDependencies,
  [],
  [],
  ColorMixerSlice
> = (set, get) => {
  const buildPaletteOperation = createAbortableOperation({
    onStart: () => {
      set({
        isBuildPaletteLoading: true,
      });
    },
    onFinish: () => {
      set({
        isBuildPaletteLoading: false,
      });
    },
  });

  registerProcessedImage({
    abort: () => {
      buildPaletteOperation.abort();
    },
    clear: () => {
      set({colorMatches: []});
    },
  });

  return {
    colorSet: null,
    isColorMixerLoading: false,
    underlayerHex: null,
    motherColorId: null,
    targetColorHex: null,
    samplingArea: null,
    colorPickerPipette: null,
    colorMatches: [],
    isColorMatchesLoading: false,
    isBuildPaletteLoading: false,

    setColorSet: async (
      colorSet: ColorSet | null,
      {setActiveTabKey = true} = {}
    ): Promise<void> => {
      const {
        selectedImageFile,
        targetColorHex,
        samplingArea,
        appSettings: {colorPickerSurfaceHex},
      } = get();
      if (colorSet && setActiveTabKey) {
        const activeTabKey = selectedImageFile ? TabKey.ColorPicker : TabKey.Photo;
        await get().setActiveTabKey(activeTabKey, {skipUnsavedChangesCheck: true});
      }
      const {colorSet: prevColorSet, colorMixingChartSet, limitedColorSet} = get();
      if (!isColorSetEqual(prevColorSet, colorSet)) {
        // Derived colors stay valid while the new color set still contains them.
        if (!includesAllColors(colorSet, colorMixingChartSet)) {
          get().clearColorMixingChart();
        }
        if (!includesAllColors(colorSet, limitedColorSet)) {
          get().clearLimitedPalette();
        }
      }
      set({
        isColorMixerLoading: true,
        colorSet,
        underlayerHex: null,
        motherColorId: null,
        colorMatches: [],
      });
      try {
        await colorMixer.setColorSet({
          colorSet,
          surfaceRgb: hexToRgb(colorPickerSurfaceHex),
        });
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
        colorMatches: [],
        isColorMatchesLoading: true,
      });
      try {
        await colorMixer.setUnderlayer(underlayerHex ? hexToRgb(underlayerHex) : null);
        const colorMatches = await findColorMatches(
          targetColorHex,
          colorPickerLayeringEnabled,
          motherColorId
        );
        set({
          colorMatches,
        });
      } finally {
        set({
          isColorMixerLoading: false,
          isColorMatchesLoading: false,
        });
      }
    },

    setSurface: async (
      surfaceHex: string,
      {persist = true}: ColorMixerUpdateOptions = {}
    ): Promise<void> => {
      if (persist) {
        await get().saveAppSettings({colorPickerSurfaceHex: surfaceHex});
      }
      const {
        targetColorHex,
        motherColorId,
        appSettings: {colorPickerLayeringEnabled},
      } = get();
      set({
        isColorMixerLoading: true,
        colorMatches: [],
        isColorMatchesLoading: true,
      });
      try {
        await colorMixer.setSurface(hexToRgb(surfaceHex));
        const colorMatches = await findColorMatches(
          targetColorHex,
          colorPickerLayeringEnabled,
          motherColorId
        );
        set({
          colorMatches,
        });
      } finally {
        set({
          isColorMixerLoading: false,
          isColorMatchesLoading: false,
        });
      }
    },

    setLayeringEnabled: async (
      layeringEnabled: boolean,
      {persist = true}: ColorMixerUpdateOptions = {}
    ): Promise<void> => {
      if (persist) {
        await get().saveAppSettings({colorPickerLayeringEnabled: layeringEnabled});
      }
      const {targetColorHex, motherColorId} = get();
      set({
        colorMatches: [],
        isColorMatchesLoading: true,
      });
      try {
        const colorMatches = await findColorMatches(targetColorHex, layeringEnabled, motherColorId);
        set({
          colorMatches,
        });
      } finally {
        set({
          isColorMatchesLoading: false,
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
        colorMatches: [],
        isColorMatchesLoading: true,
      });
      try {
        const colorMatches = await findColorMatches(
          targetColorHex,
          colorPickerLayeringEnabled,
          motherColorId
        );
        set({
          colorMatches,
        });
      } finally {
        set({
          isColorMatchesLoading: false,
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
        colorMatches: [],
        selectedPaletteColorMixtures: new Map(),
        isColorMatchesLoading: true,
      });
      try {
        const colorMatches = await findColorMatches(
          targetColorHex,
          colorPickerLayeringEnabled,
          motherColorId
        );
        set({
          colorMatches,
        });
      } finally {
        set({
          isColorMatchesLoading: false,
        });
      }
    },

    setColorPickerPipette: (colorPickerPipette: SamplingArea | null): void => {
      set({
        colorPickerPipette,
      });
    },

    buildPalette: async (): Promise<number | undefined> => {
      get().abortBuildPalette();
      const {
        originalImage,
        motherColorId,
        appSettings: {colorPickerLayeringEnabled},
      } = get();
      if (!originalImage) {
        return;
      }
      return buildPaletteOperation.run(async signal => {
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
        const colorMatches: (ColorMatch | undefined)[] = await abortablePromise(
          colorMixer.findBestColorMatches(targetColors, colorPickerLayeringEnabled, motherColorId),
          signal
        );

        // Replace image RGB with matched paint RGB for perceptual merging.
        const paintPoints: SamplingPointWithColorMatch[] = [];
        for (const [index, samplingPoint] of rawPoints.entries()) {
          const colorMatch = colorMatches[index];
          if (!colorMatch) {
            continue;
          }
          const paintPoint: SamplingPointWithColorMatch = {
            ...samplingPoint,
            rgb: colorMatch.colorMixture.layerRgb,
            colorMatch,
          };
          paintPoints.push(paintPoint);
        }

        const mergedPoints: SamplingPointWithColorMatch[] = mergeSimilarSamplingPoints(paintPoints);

        const {center} = ZoomableImageCanvas.imageDimension(originalImage);
        const paletteEntries: SaveToPaletteEntry[] = [];
        for (const {
          x,
          y,
          colorMatch: {colorMixture},
        } of mergedPoints) {
          signal.throwIfAborted();
          paletteEntries.push({
            colorMixture,
            samplingArea: {
              x: x - center.x,
              y: y - center.y,
              diameter: 1,
            },
          });
        }
        if (paletteEntries.length) {
          await get().saveToPaletteBulk(paletteEntries, signal);
        }
        return paletteEntries.length;
      });
    },

    abortBuildPalette: (): void => {
      buildPaletteOperation.abort();
    },
  };
};

async function findColorMatches(
  targetColorHex: string | null,
  considerTransparentLayers: boolean,
  motherColorId?: ColorId | null
): Promise<ColorMatch[]> {
  if (!targetColorHex) {
    return [];
  }
  return colorMixer.findColorMatches(
    hexToRgb(targetColorHex),
    considerTransparentLayers,
    motherColorId
  );
}
