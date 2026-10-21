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

import type {ImageFile} from '@/services/image/image-file';
import {createPosterizedImageSlice} from '@/stores/posterized-image-slice';

const operations = vi.hoisted(() => ({
  resizeImageBitmap: vi.fn(),
  workerRun: vi.fn(),
  imageToBlob: vi.fn(),
  blobToImageFile: vi.fn(),
}));

vi.mock('@/utils/graphics', () => ({
  IMAGE_SIZE: {SD: 345600},
  ResizeImage: {resizeToPixelCount: vi.fn()},
  resizeImageBitmap: operations.resizeImageBitmap,
  imageToBlob: operations.imageToBlob,
}));
vi.mock('@/stores/original-image-slice', () => ({registerOriginalImageDependency: vi.fn()}));
vi.mock('@/services/image/image-file', () => ({blobToImageFile: operations.blobToImageFile}));
vi.mock('@/services/image/worker/color-quantization-worker-manager', () => ({
  colorQuantizationWorker: {run: operations.workerRun},
}));

type TestStore = ReturnType<Parameters<typeof createPosterizedImageSlice>[1]>;

function image(): ImageBitmap {
  return {width: 80, height: 50, close: vi.fn()};
}

function createTestStore() {
  return createStore<TestStore>()((...args) => ({
    originalImage: image(),
    selectedImageFile: {name: 'Photo'} as ImageFile,
    saveRecentImageFile: vi.fn().mockResolvedValue(undefined),
    ...createPosterizedImageSlice(...args),
  }));
}

beforeEach(() => {
  operations.resizeImageBitmap.mockResolvedValue(image());
  operations.workerRun.mockResolvedValue({quantizedImage: image()});
  operations.imageToBlob.mockResolvedValue(new Blob());
  operations.blobToImageFile.mockResolvedValue({});
});

afterEach(() => vi.resetAllMocks());

describe('posterized image ownership', () => {
  it('saves losslessly and releases the worker result', async () => {
    const store = createTestStore();
    const result = image();
    const file = {} as ImageFile;
    operations.workerRun.mockResolvedValueOnce({quantizedImage: result});
    operations.blobToImageFile.mockResolvedValueOnce(file);

    await store.getState().posterizeImage(24);

    expect(operations.imageToBlob).toHaveBeenCalledExactlyOnceWith(result, {
      encodeOptions: {type: 'image/png'},
    });
    expect(store.getState().saveRecentImageFile).toHaveBeenCalledExactlyOnceWith(file);
    expect(file.maxColors).toBe(24);
    expect(result.close).toHaveBeenCalledOnce();
  });

  it('releases the worker result when encoding fails', async () => {
    const store = createTestStore();
    const result = image();
    operations.workerRun.mockResolvedValueOnce({quantizedImage: result});
    operations.imageToBlob.mockRejectedValueOnce(new Error('Encoding failed'));

    await expect(store.getState().posterizeImage(24)).rejects.toThrow('Encoding failed');

    expect(result.close).toHaveBeenCalledOnce();
    expect(store.getState().saveRecentImageFile).not.toHaveBeenCalled();
    expect(store.getState().isPosterizedImageLoading).toBe(false);
  });

  it('releases a resized image if canceled before transferring it', async () => {
    const store = createTestStore();
    const resized = image();
    operations.resizeImageBitmap.mockImplementationOnce(async () => {
      store.getState().abortPosterizeImage();
      return resized;
    });

    await store.getState().posterizeImage(24);

    expect(resized.close).toHaveBeenCalledOnce();
    expect(operations.workerRun).not.toHaveBeenCalled();
    expect(store.getState().saveRecentImageFile).not.toHaveBeenCalled();
  });
});
