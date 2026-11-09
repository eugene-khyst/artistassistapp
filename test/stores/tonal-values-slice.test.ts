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

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import type {ImageDependency} from '@/stores/registry/image-dependency-registry';
import {createTonalValuesSlice} from '@/stores/tonal-values-slice';

const operations = vi.hoisted(() => ({
  createImageBitmapAndResize: vi.fn(),
  resizeToPixelCount: vi.fn(),
  toOffscreenCanvas: vi.fn(),
  setImage: vi.fn(),
  calculatePercentiles: vi.fn(),
  adjustColors: vi.fn(),
  extractTonalValues: vi.fn(),
  registerOriginalImageDependency: vi.fn(),
}));

vi.mock('@eugene-khyst/artistassistapp-image-processing/utils/graphics', () => ({
  IMAGE_SIZE: {'2K': 2048 * 1080},
  ResizeImage: {resizeToPixelCount: operations.resizeToPixelCount},
  createImageBitmapAndResize: operations.createImageBitmapAndResize,
  toOffscreenCanvas: operations.toOffscreenCanvas,
}));
vi.mock('@eugene-khyst/artistassistapp-image-processing/rgb-channels-percentile', () => ({
  RgbChannelsPercentileCalculator: class {
    setImage = operations.setImage;
    calculatePercentiles = operations.calculatePercentiles;
  },
}));
vi.mock('@eugene-khyst/artistassistapp-image-processing/adjust-colors', () => ({
  adjustColors: operations.adjustColors,
}));
vi.mock('@eugene-khyst/artistassistapp-image-processing/tonal-values', () => ({
  extractTonalValues: operations.extractTonalValues,
}));
vi.mock('@/stores/original-image-slice', () => ({
  registerOriginalImageDependency: operations.registerOriginalImageDependency,
}));

type TestStore = ReturnType<Parameters<typeof createTonalValuesSlice>[1]>;

const resize = vi.fn();

function image(): ImageBitmap {
  return {width: 80, height: 50, close: vi.fn()};
}

function tonalImages(): ImageBitmap[] {
  return [image(), image(), image(), image()];
}

function createTestStore() {
  return createStore<TestStore>()((...args) => ({
    originalImage: image(),
    ...createTonalValuesSlice(...args),
  }));
}

function originalImageDependency(): ImageDependency {
  const [[dependency]] = operations.registerOriginalImageDependency.mock.calls as [
    [ImageDependency],
  ];
  return dependency;
}

beforeEach(() => {
  operations.resizeToPixelCount.mockReturnValue(resize);
  operations.createImageBitmapAndResize.mockImplementation(() => Promise.resolve(image()));
  operations.adjustColors.mockReturnValue({});
  operations.extractTonalValues.mockImplementation(tonalImages);
});

afterEach(() => vi.resetAllMocks());

describe('comparison tonal values', () => {
  it('extracts tonal values from the photo resized like the original image', async () => {
    const store = createTestStore();
    const file = new File([], 'painting.jpg');
    const photo = image();
    const result = tonalImages();
    operations.createImageBitmapAndResize.mockResolvedValueOnce(photo);
    operations.extractTonalValues.mockReturnValueOnce(result);

    await expect(store.getState().loadComparisonTonalImages(file)).resolves.toBe(true);

    expect(operations.resizeToPixelCount).toHaveBeenCalledExactlyOnceWith(2048 * 1080);
    expect(operations.createImageBitmapAndResize).toHaveBeenCalledExactlyOnceWith(file, resize);
    expect(photo.close).toHaveBeenCalledOnce();
    expect(store.getState().comparisonTonalImages).toBe(result);
    expect(store.getState().isComparisonTonalImagesLoading).toBe(false);
  });

  it('applies the default Percentile white balance to the photo before extracting tonal values', async () => {
    const store = createTestStore();
    const photo = image();
    const canvas = {};
    const maxValues = [0.4, 0.5, 0.6];
    const balancedPhoto = {};
    operations.createImageBitmapAndResize.mockResolvedValueOnce(photo);
    operations.toOffscreenCanvas.mockReturnValueOnce(canvas);
    operations.calculatePercentiles.mockReturnValueOnce(maxValues);
    operations.adjustColors.mockReturnValueOnce(balancedPhoto);

    await store.getState().loadComparisonTonalImages(new File([], 'painting.jpg'));

    expect(operations.toOffscreenCanvas).toHaveBeenCalledExactlyOnceWith(photo);
    expect(operations.setImage).toHaveBeenCalledExactlyOnceWith(canvas);
    expect(operations.calculatePercentiles).toHaveBeenCalledExactlyOnceWith(0.98);
    expect(operations.adjustColors).toHaveBeenCalledExactlyOnceWith(canvas, {}, {maxValues});
    expect(operations.extractTonalValues).toHaveBeenCalledExactlyOnceWith(balancedPhoto);
  });

  it('releases the previous comparison when a new photo replaces it', async () => {
    const store = createTestStore();
    const previous = tonalImages();
    const next = tonalImages();
    operations.extractTonalValues.mockReturnValueOnce(previous).mockReturnValueOnce(next);
    await store.getState().loadComparisonTonalImages(new File([], 'first.jpg'));

    await store.getState().loadComparisonTonalImages(new File([], 'second.jpg'));

    previous.forEach(image => {
      expect(image.close).toHaveBeenCalledOnce();
    });
    next.forEach(image => {
      expect(image.close).not.toHaveBeenCalled();
    });
    expect(store.getState().comparisonTonalImages).toBe(next);
  });

  it('commits only the latest of overlapping photos', async () => {
    const store = createTestStore();
    const firstPhoto = image();
    const secondPhoto = image();
    const result = tonalImages();
    let resolveFirstPhoto!: (photo: ImageBitmap) => void;
    operations.createImageBitmapAndResize
      .mockImplementationOnce(
        () =>
          new Promise<ImageBitmap>(resolve => {
            resolveFirstPhoto = resolve;
          })
      )
      .mockResolvedValueOnce(secondPhoto);
    operations.extractTonalValues.mockReturnValueOnce(result);

    const first = store.getState().loadComparisonTonalImages(new File([], 'first.jpg'));
    await expect(
      store.getState().loadComparisonTonalImages(new File([], 'second.jpg'))
    ).resolves.toBe(true);
    resolveFirstPhoto(firstPhoto);

    await expect(first).resolves.toBe(false);
    expect(firstPhoto.close).toHaveBeenCalledOnce();
    expect(operations.toOffscreenCanvas).toHaveBeenCalledExactlyOnceWith(secondPhoto);
    expect(store.getState().comparisonTonalImages).toBe(result);
  });

  it('releases the comparison on exit', async () => {
    const store = createTestStore();
    const result = tonalImages();
    operations.extractTonalValues.mockReturnValueOnce(result);
    await store.getState().loadComparisonTonalImages(new File([], 'painting.jpg'));

    store.getState().clearComparisonTonalImages();

    expect(store.getState().comparisonTonalImages).toEqual([]);
    result.forEach(image => {
      expect(image.close).toHaveBeenCalledOnce();
    });
  });

  it('cancels a photo still loading on exit', async () => {
    const store = createTestStore();
    const photo = image();
    operations.createImageBitmapAndResize.mockImplementationOnce(() => {
      store.getState().clearComparisonTonalImages();
      return Promise.resolve(photo);
    });

    await expect(
      store.getState().loadComparisonTonalImages(new File([], 'painting.jpg'))
    ).resolves.toBe(false);

    expect(photo.close).toHaveBeenCalledOnce();
    expect(operations.extractTonalValues).not.toHaveBeenCalled();
    expect(store.getState().comparisonTonalImages).toEqual([]);
    expect(store.getState().isComparisonTonalImagesLoading).toBe(false);
  });

  it('releases the comparison when the original image changes', async () => {
    const store = createTestStore();
    const result = tonalImages();
    operations.extractTonalValues.mockReturnValueOnce(result);
    await store.getState().loadComparisonTonalImages(new File([], 'painting.jpg'));

    originalImageDependency().clear!();

    expect(store.getState().comparisonTonalImages).toEqual([]);
    result.forEach(image => {
      expect(image.close).toHaveBeenCalledOnce();
    });
  });

  it('discards a photo still loading when the original image changes', async () => {
    const store = createTestStore();
    const photo = image();
    operations.createImageBitmapAndResize.mockImplementationOnce(() => {
      originalImageDependency().abort!();
      return Promise.resolve(photo);
    });

    await expect(
      store.getState().loadComparisonTonalImages(new File([], 'painting.jpg'))
    ).resolves.toBe(false);

    expect(photo.close).toHaveBeenCalledOnce();
    expect(operations.extractTonalValues).not.toHaveBeenCalled();
    expect(store.getState().comparisonTonalImages).toEqual([]);
    expect(store.getState().isComparisonTonalImagesLoading).toBe(false);
  });

  it('keeps the current comparison when a new photo cannot be read', async () => {
    const store = createTestStore();
    const result = tonalImages();
    operations.extractTonalValues.mockReturnValueOnce(result);
    await store.getState().loadComparisonTonalImages(new File([], 'painting.jpg'));
    operations.createImageBitmapAndResize.mockRejectedValueOnce(new Error('Decoding failed'));

    await expect(
      store.getState().loadComparisonTonalImages(new File([], 'broken.jpg'))
    ).rejects.toThrow('Decoding failed');

    expect(store.getState().comparisonTonalImages).toBe(result);
    result.forEach(image => {
      expect(image.close).not.toHaveBeenCalled();
    });
    expect(store.getState().isComparisonTonalImagesLoading).toBe(false);
  });
});
