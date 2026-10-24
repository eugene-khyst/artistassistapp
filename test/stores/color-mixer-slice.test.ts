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
  type ColorMatch,
  type ColorSet,
  ColorType,
  type RgbTuple,
} from '@eugene-khyst/artistassistapp-color-mixer';
import type {SamplingPoint} from '@eugene-khyst/artistassistapp-image-processing/sampling-point';
import type * as graphics from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {type ColorQuantization} from '@/services/image/color-quantization';
import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import {createColorMixerSlice} from '@/stores/color-mixer-slice';

const operations = vi.hoisted(() => ({
  getSamplingPoints: vi.fn(),
  findBestColorMatches: vi.fn(),
  resizeImageBitmap: vi.fn(),
  getImageData: vi.fn(),
  setColorSet: vi.fn(),
  setUnderlayer: vi.fn(),
  setSurface: vi.fn(),
}));

vi.mock('@/services/color/worker/color-mixer-worker-manager', () => ({
  colorMixer: {
    findBestColorMatches: operations.findBestColorMatches,
    setColorSet: operations.setColorSet,
    setUnderlayer: operations.setUnderlayer,
    setSurface: operations.setSurface,
  },
}));
vi.mock('@/services/image/worker/color-quantization-worker-manager', () => ({
  colorQuantizationWorker: {
    run: async (task: (worker: ColorQuantization) => SamplingPoint[]) =>
      task({getSamplingPoints: operations.getSamplingPoints} as unknown as ColorQuantization),
  },
}));
vi.mock('@/stores/original-image-slice', () => ({registerOriginalImageDependency: vi.fn()}));
vi.mock('@eugene-khyst/artistassistapp-image-processing/utils/graphics', async importOriginal => ({
  ...(await importOriginal<typeof graphics>()),
  resizeImageBitmap: operations.resizeImageBitmap,
  drawImageToOffscreenCanvas: () => [null, {getImageData: operations.getImageData}],
}));

type TestStore = ReturnType<Parameters<typeof createColorMixerSlice>[1]>;

function createImage(width: number, height: number): ImageBitmap {
  return {width, height, close: vi.fn()};
}

function createTestStore() {
  const saveToPaletteBulk = vi.fn<TestStore['saveToPaletteBulk']>().mockResolvedValue(undefined);
  const store = createStore<TestStore>()((...args) => ({
    appSettings: DEFAULT_APP_SETTINGS,
    saveAppSettings: vi.fn(),
    setActiveTabKey: vi.fn(),
    selectedImageFile: null,
    originalImage: createImage(160, 100),
    selectedPaletteColorMixtures: new Map(),
    saveToPaletteBulk,
    colorMixingChartSet: null,
    clearColorMixingChart: vi.fn(),
    limitedColorSet: null,
    clearLimitedPalette: vi.fn(),
    ...createColorMixerSlice(...args),
  }));
  return {store, saveToPaletteBulk};
}

function match(rgb: RgbTuple): ColorMatch {
  return {colorMixture: {layerRgb: rgb}} as ColorMatch;
}

beforeEach(() => {
  operations.resizeImageBitmap.mockResolvedValue(createImage(80, 50));
  operations.getSamplingPoints.mockReturnValue([
    {rgb: [100, 100, 100], x: 20, y: 15, pixelCount: 100},
  ]);
  operations.getImageData.mockReturnValue({data: new Uint8ClampedArray([220, 30, 80, 255])});
  operations.findBestColorMatches.mockResolvedValue([match([200, 40, 90])]);
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('auto palette', () => {
  it('averages a noisy center pixel before matching paint colors', async () => {
    const {store} = createTestStore();
    const data = new Uint8ClampedArray(
      Array.from({length: 25}, (_, i) =>
        i === 12 ? [255, 255, 255, 255] : [100, 100, 100, 255]
      ).flat()
    );
    operations.getImageData.mockReturnValue({data, width: 5, height: 5});

    await store.getState().buildPalette(24);

    expect(operations.findBestColorMatches).toHaveBeenCalledExactlyOnceWith(
      [[122, 122, 122]],
      DEFAULT_APP_SETTINGS.colorPickerLayeringEnabled,
      null
    );
  });

  it('returns two mixtures when sampled areas are black and white despite intermediate analysis colors', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockReturnValue(
      [0, 100, 180, 255].map((gray, x) => ({rgb: [gray, gray, gray], x, y: 10, pixelCount: 1}))
    );
    for (const gray of [0, 0, 255, 255]) {
      operations.getImageData.mockReturnValueOnce({
        data: new Uint8ClampedArray([gray, gray, gray, 255]),
      });
    }
    operations.findBestColorMatches.mockImplementationOnce(async (colors: RgbTuple[]) =>
      colors.map(match)
    );

    await expect(store.getState().buildPalette(48)).resolves.toBe(2);

    const [entries] = saveToPaletteBulk.mock.calls[0]!;
    expect(entries.map(({colorMixture}) => colorMixture.layerRgb)).toEqual([
      [0, 0, 0],
      [255, 255, 255],
    ]);
  });

  it('matches the original pixels around the corresponding original image coordinate', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    store.setState({motherColorId: [1, 2]});

    await expect(store.getState().buildPalette(24)).resolves.toBe(1);

    expect(operations.getSamplingPoints).toHaveBeenCalledWith(
      expect.objectContaining({width: 80, height: 50}),
      48
    );
    expect(operations.getImageData).toHaveBeenCalledExactlyOnceWith(39, 29, 5, 5);
    expect(operations.findBestColorMatches).toHaveBeenCalledExactlyOnceWith(
      [[220, 30, 80]],
      DEFAULT_APP_SETTINGS.colorPickerLayeringEnabled,
      [1, 2]
    );
    expect(saveToPaletteBulk).toHaveBeenCalledExactlyOnceWith(
      [
        {
          colorMixture: {layerRgb: [200, 40, 90]},
          samplingArea: {x: -38.5, y: -18.5, diameter: 5},
        },
      ],
      expect.any(AbortSignal)
    );
    expect(store.getState().isBuildPaletteLoading).toBe(false);
  });

  it('keeps the sampled circle inside the image at a corner', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockReturnValue([
      {rgb: [100, 100, 100], x: 0, y: 0, pixelCount: 100},
    ]);

    await store.getState().buildPalette(24);

    expect(operations.getImageData).toHaveBeenCalledExactlyOnceWith(0, 0, 5, 5);
    expect(saveToPaletteBulk).toHaveBeenCalledExactlyOnceWith(
      [
        {
          colorMixture: {layerRgb: [200, 40, 90]},
          samplingArea: {x: -77.5, y: -47.5, diameter: 5},
        },
      ],
      expect.any(AbortSignal)
    );
  });

  it.each([12, 24, 36, 48])('saves at most %i distinct paint colors', async maxColors => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockReturnValue(
      Array.from({length: maxColors * 2}, (_, i) => ({
        rgb: [0, 0, 0],
        x: i % 80,
        y: 10,
        pixelCount: 1,
      }))
    );
    operations.findBestColorMatches.mockResolvedValue(
      Array.from({length: maxColors * 2}, (_, i) => match([i * 2, i * 2, i * 2]))
    );

    await expect(store.getState().buildPalette(maxColors)).resolves.toBe(maxColors);

    const [entries] = saveToPaletteBulk.mock.calls[0]!;
    expect(entries).toHaveLength(maxColors);
  });

  it('removes duplicate paint colors and skips missing matches', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockReturnValue(
      Array.from({length: 4}, (_, x) => ({rgb: [100, 100, 100], x, y: 10, pixelCount: 1}))
    );
    operations.findBestColorMatches.mockResolvedValue([
      match([200, 40, 90]),
      match([200, 40, 90]),
      undefined,
      match([20, 40, 90]),
    ]);

    await expect(store.getState().buildPalette(24)).resolves.toBe(2);

    const [entries] = saveToPaletteBulk.mock.calls[0]!;
    expect(entries).toHaveLength(2);
  });

  it('does not save matches after cancellation', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.findBestColorMatches.mockImplementationOnce(async () => {
      store.getState().abortBuildPalette();
      return [match([200, 40, 90])];
    });

    await expect(store.getState().buildPalette(24)).resolves.toBeUndefined();

    expect(saveToPaletteBulk).not.toHaveBeenCalled();
    expect(store.getState().isBuildPaletteLoading).toBe(false);
  });

  it('does not read an original image replaced while finding sampling points', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockImplementationOnce(() => {
      store.getState().abortBuildPalette();
      return [{rgb: [100, 100, 100], x: 20, y: 15, pixelCount: 100}];
    });

    await expect(store.getState().buildPalette(24)).resolves.toBeUndefined();

    expect(operations.getImageData).not.toHaveBeenCalled();
    expect(operations.findBestColorMatches).not.toHaveBeenCalled();
    expect(saveToPaletteBulk).not.toHaveBeenCalled();
  });

  it('preserves image coverage when sampling original pixels and matching paints', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockReturnValue([
      {rgb: [155, 102, 35], x: 10, y: 10, pixelCount: 1},
      {rgb: [207, 193, 163], x: 20, y: 15, pixelCount: 999},
    ]);
    operations.findBestColorMatches.mockResolvedValue([
      match([155, 102, 35]),
      match([207, 193, 163]),
    ]);
    operations.getImageData
      .mockReturnValueOnce({data: new Uint8ClampedArray([155, 102, 35, 255])})
      .mockReturnValueOnce({data: new Uint8ClampedArray([207, 193, 163, 255])});

    await expect(store.getState().buildPalette(1)).resolves.toBe(1);

    expect(saveToPaletteBulk).toHaveBeenCalledExactlyOnceWith(
      [
        {
          colorMixture: {layerRgb: [207, 193, 163]},
          samplingArea: {x: -38.5, y: -18.5, diameter: 5},
        },
      ],
      expect.any(AbortSignal)
    );
  });

  it('chooses paints against original pixel colors rather than other paint matches', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockReturnValue([
      {rgb: [149, 149, 149], x: 10, y: 10, pixelCount: 900},
      {rgb: [160, 160, 160], x: 20, y: 15, pixelCount: 100},
    ]);
    operations.getImageData
      .mockReturnValueOnce({data: new Uint8ClampedArray([149, 149, 149, 255])})
      .mockReturnValueOnce({data: new Uint8ClampedArray([160, 160, 160, 255])});
    operations.findBestColorMatches.mockResolvedValue([
      match([100, 100, 100]),
      match([160, 160, 160]),
    ]);

    await expect(store.getState().buildPalette(1)).resolves.toBe(1);

    expect(saveToPaletteBulk).toHaveBeenCalledExactlyOnceWith(
      [
        {
          colorMixture: {layerRgb: [160, 160, 160]},
          samplingArea: {x: -38.5, y: -18.5, diameter: 5},
        },
      ],
      expect.any(AbortSignal)
    );
  });

  it('releases a resized image if canceled before transferring it', async () => {
    const {store, saveToPaletteBulk} = createTestStore();
    const resizedImage = createImage(80, 50);
    operations.resizeImageBitmap.mockImplementationOnce(async () => {
      store.getState().abortBuildPalette();
      return resizedImage;
    });

    await expect(store.getState().buildPalette(24)).resolves.toBeUndefined();

    expect(resizedImage.close).toHaveBeenCalledOnce();
    expect(operations.getSamplingPoints).not.toHaveBeenCalled();
    expect(saveToPaletteBulk).not.toHaveBeenCalled();
  });

  it.each([
    {
      setting: 'color set',
      change: (state: TestStore) => state.setColorSet(null, {setActiveTabKey: false}),
    },
    {setting: 'underlayer', change: (state: TestStore) => state.setUnderlayer('#fff')},
    {setting: 'surface', change: (state: TestStore) => state.setSurface('#fff', {persist: false})},
    {
      setting: 'layering',
      change: (state: TestStore) => state.setLayeringEnabled(false, {persist: false}),
    },
    {setting: 'mother color', change: (state: TestStore) => state.setMotherColor([1, 2])},
  ])('cancels auto palette when the $setting changes', async ({change}) => {
    const {store, saveToPaletteBulk} = createTestStore();
    operations.getSamplingPoints.mockImplementationOnce(async () => {
      await change(store.getState());
      return [{rgb: [100, 100, 100], x: 20, y: 15, pixelCount: 100}];
    });

    await expect(store.getState().buildPalette(24)).resolves.toBeUndefined();

    expect(saveToPaletteBulk).not.toHaveBeenCalled();
    expect(store.getState().isBuildPaletteLoading).toBe(false);
  });

  it('keeps the limited palette when the same color set is activated again', async () => {
    const {store} = createTestStore();
    const colorSet = {type: ColorType.OilPaint, colors: []} as unknown as ColorSet;
    store.setState({colorSet});

    await store.getState().setColorSet(colorSet, {setActiveTabKey: false});

    expect(store.getState().clearLimitedPalette).not.toHaveBeenCalled();
  });

  it('clears an in-progress limited palette when the main color set changes', async () => {
    const {store} = createTestStore();
    store.setState({colorSet: {type: ColorType.OilPaint, colors: []} as unknown as ColorSet});

    await store.getState().setColorSet(null, {setActiveTabKey: false});

    expect(store.getState().clearLimitedPalette).toHaveBeenCalledOnce();
  });
});
