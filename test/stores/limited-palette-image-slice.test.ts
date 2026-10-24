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

import {type ColorSet, ColorType} from '@eugene-khyst/artistassistapp-color-mixer';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import type {ColorQuantization} from '@/services/image/color-quantization';
import {createLimitedPaletteImageSlice} from '@/stores/limited-palette-image-slice';

const operations = vi.hoisted(() => ({
  resizeImageBitmap: vi.fn(),
  getLimitedPaletteImage: vi.fn(),
}));

vi.mock('@eugene-khyst/artistassistapp-image-processing/utils/graphics', () => ({
  IMAGE_SIZE: {SD: 345600},
  ResizeImage: {resizeToPixelCount: vi.fn()},
  resizeImageBitmap: operations.resizeImageBitmap,
}));
vi.mock('@/stores/original-image-slice', () => ({registerOriginalImageDependency: vi.fn()}));
vi.mock('@/services/image/worker/color-quantization-worker-manager', () => ({
  colorQuantizationWorker: {
    run: async (task: (worker: ColorQuantization) => Promise<unknown>) =>
      task({
        getLimitedPaletteImage: operations.getLimitedPaletteImage,
      } as unknown as ColorQuantization),
  },
}));

type TestStore = ReturnType<Parameters<typeof createLimitedPaletteImageSlice>[1]>;

const COLOR_SET: ColorSet = {
  type: ColorType.WatercolorPaint,
  brands: new Map(),
  colors: [{id: 1, brand: 1, name: 'Blue', rgb: [32, 64, 160], rho: []}],
};

function image(): ImageBitmap {
  return {width: 80, height: 50, close: vi.fn()};
}

function createTestStore() {
  return createStore<TestStore>()((...args) => ({
    originalImage: image(),
    colorSet: COLOR_SET,
    saveColorSet: vi.fn(),
    loadColorSets: vi.fn(),
    setActiveTabKey: vi.fn(),
    ...createLimitedPaletteImageSlice(...args),
  }));
}

beforeEach(() => {
  operations.resizeImageBitmap.mockResolvedValue(image());
  operations.getLimitedPaletteImage.mockResolvedValue({quantizedImage: image()});
});

afterEach(() => vi.resetAllMocks());

describe('limited palette image ownership', () => {
  it('releases the previous result even when its replacement fails', async () => {
    const store = createTestStore();
    const previous = image();
    store.setState({limitedPaletteImage: previous, limitedColorSet: COLOR_SET});
    operations.getLimitedPaletteImage.mockRejectedValueOnce(new Error('Quantization failed'));

    await expect(store.getState().setLimitedColorSet([[1, 1]])).rejects.toThrow(
      'Quantization failed'
    );

    expect(previous.close).toHaveBeenCalledOnce();
    expect(store.getState().limitedPaletteImage).toBeNull();
    expect(store.getState().isLimitedPaletteImageLoading).toBe(false);
  });

  it('releases a resized image if canceled before transferring it', async () => {
    const store = createTestStore();
    const resized = image();
    operations.resizeImageBitmap.mockImplementationOnce(async () => {
      store.getState().abortLimitedPalette();
      return resized;
    });

    await store.getState().setLimitedColorSet([[1, 1]]);

    expect(resized.close).toHaveBeenCalledOnce();
    expect(operations.getLimitedPaletteImage).not.toHaveBeenCalled();
    expect(store.getState().limitedPaletteImage).toBeNull();
  });

  it('discards a result returned after cancellation', async () => {
    const store = createTestStore();
    const result = image();
    operations.getLimitedPaletteImage.mockImplementationOnce(async () => {
      store.getState().abortLimitedPalette();
      return {quantizedImage: result};
    });

    await store.getState().setLimitedColorSet([[1, 1]]);

    expect(result.close).toHaveBeenCalledOnce();
    expect(store.getState().limitedPaletteImage).toBeNull();
    expect(store.getState().limitedColorSet).toBeNull();
  });
});
