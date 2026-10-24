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

import {Vector} from '@eugene-khyst/artistassistapp-image-processing/math/geometry';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import type {ImageFile} from '@/services/image/image-file';
import type {ImageDependency} from '@/stores/registry/image-dependency-registry';
import {createSimplifyImageSlice} from '@/stores/simplify-image-slice';

const operations = vi.hoisted(() => ({
  simplifyImage: vi.fn(),
  applyFocalPointToSimplifiedImage: vi.fn(),
  registerOriginalImageDependency: vi.fn(),
}));

vi.mock('@eugene-khyst/artistassistapp-image-processing/simplify-image', () => ({
  simplifyImage: operations.simplifyImage,
  applyFocalPointToSimplifiedImage: operations.applyFocalPointToSimplifiedImage,
}));
vi.mock('@/stores/original-image-slice', () => ({
  registerOriginalImageDependency: operations.registerOriginalImageDependency,
}));

type TestStore = ReturnType<Parameters<typeof createSimplifyImageSlice>[1]>;

function image(): ImageBitmap {
  return {width: 200, height: 100, close: vi.fn()};
}

function createTestStore(selectedImageFile: Partial<ImageFile> = {digest: 'photo'}) {
  return createStore<TestStore>()((...args) => ({
    originalImage: image(),
    selectedImageFile: selectedImageFile as ImageFile,
    saveImageFocalPoint: vi.fn().mockResolvedValue(undefined),
    ...createSimplifyImageSlice(...args),
  }));
}

beforeEach(() => {
  operations.simplifyImage.mockImplementation(() => [image(), image(), image()]);
  operations.applyFocalPointToSimplifiedImage.mockImplementation(() => image());
});

afterEach(() => vi.resetAllMocks());

describe('simplify image focal point', () => {
  it('restores the saved focal point in simplified image pixels', async () => {
    const store = createTestStore({digest: 'photo', focalPoint: {x: 0.25, y: 0.5}});

    await store.getState().loadSimplifiedImages();

    expect(store.getState().simplifyFocalPoint).toEqual(new Vector(50, 50));
    expect(operations.applyFocalPointToSimplifiedImage).toHaveBeenCalledExactlyOnceWith(
      store.getState().simplifiedImages,
      new Vector(50, 50)
    );
  });

  it('generates without a focal point when none is saved', async () => {
    const store = createTestStore();

    await store.getState().loadSimplifiedImages();

    expect(store.getState().simplifyFocalPoint).toBeNull();
    expect(operations.applyFocalPointToSimplifiedImage).toHaveBeenCalledExactlyOnceWith(
      store.getState().simplifiedImages,
      null
    );
  });

  it('saves the applied point normalized for the selected photo', async () => {
    const store = createTestStore();
    await store.getState().loadSimplifiedImages();

    await store.getState().setSimplifyFocalPoint(new Vector(150, 25));

    expect(store.getState().simplifyFocalPoint).toEqual(new Vector(150, 25));
    expect(store.getState().saveImageFocalPoint).toHaveBeenCalledExactlyOnceWith('photo', {
      x: 0.75,
      y: 0.25,
    });
  });

  it('clears the saved point with null', async () => {
    const store = createTestStore({digest: 'photo', focalPoint: {x: 0.25, y: 0.5}});
    await store.getState().loadSimplifiedImages();

    await store.getState().setSimplifyFocalPoint(null);

    expect(store.getState().simplifyFocalPoint).toBeNull();
    expect(store.getState().saveImageFocalPoint).toHaveBeenCalledExactlyOnceWith('photo', null);
  });

  it('reapplies an externally changed focal point without saving it', async () => {
    const store = createTestStore();
    const [[dependency]] = operations.registerOriginalImageDependency.mock.calls as [
      [ImageDependency],
    ];
    await store.getState().loadSimplifiedImages();
    store.setState({
      selectedImageFile: {digest: 'photo', focalPoint: {x: 0.5, y: 0.25}} as ImageFile,
    });

    dependency.onMetadataChange!();
    await vi.waitFor(() => {
      expect(store.getState().simplifyFocalPoint).toEqual(new Vector(100, 25));
    });

    expect(operations.applyFocalPointToSimplifiedImage).toHaveBeenLastCalledWith(
      store.getState().simplifiedImages,
      new Vector(100, 25)
    );
    expect(store.getState().saveImageFocalPoint).not.toHaveBeenCalled();
  });

  it('saves nothing before simplified images exist', async () => {
    const store = createTestStore();

    await store.getState().setSimplifyFocalPoint(new Vector(10, 10));

    expect(store.getState().saveImageFocalPoint).not.toHaveBeenCalled();
  });
});
