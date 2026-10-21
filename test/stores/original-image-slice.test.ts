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

import {afterEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {TonalValue} from '@/services/color/tonal-value';
import type {ImageFile, RecentImage} from '@/services/image/image-file';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {ColorMixerSlice} from '@/stores/color-mixer-slice';
import {
  createOriginalImageSlice,
  type OriginalImageSlice,
  registerOriginalImageDependency,
} from '@/stores/original-image-slice';
import type {PaletteSlice} from '@/stores/palette-slice';
import type {TabSlice} from '@/stores/tab-slice';

const dbOperations = vi.hoisted(() => ({
  deleteImageFileAndColorMixturesByDigest: vi.fn(),
  getImageMetadata: vi.fn(),
  getRecentImages: vi.fn(),
  saveImageFocalPoint: vi.fn(),
  saveNewImageFiles: vi.fn(),
  touchImage: vi.fn(),
}));

vi.mock('@/services/db/image-file-db', () => dbOperations);

type TestStore = OriginalImageSlice &
  Pick<AppSlice, 'saveStoreChangeTokens'> &
  Pick<CloudSlice, 'pushCloudState'> &
  Pick<ColorMixerSlice, 'colorSet' | 'setTargetColor' | 'setUnderlayer'> &
  Pick<
    PaletteSlice,
    | 'paletteColorMixtures'
    | 'selectedPaletteColorMixtures'
    | 'selectedTonalValue'
    | 'loadPaletteColorMixtures'
  > &
  Pick<TabSlice, 'setActiveTabKey'>;

function recentImage(digest: string): RecentImage {
  return {digest, type: 'image/png', date: new Date('2026-01-01T00:00:00.000Z')};
}

function createTestStore() {
  return createStore<TestStore>()((...args) => ({
    colorSet: null,
    paletteColorMixtures: new Map(),
    selectedPaletteColorMixtures: new Map(),
    selectedTonalValue: null,
    loadPaletteColorMixtures: vi.fn(async (): Promise<void> => undefined),
    pushCloudState: vi.fn(async (): Promise<void> => undefined),
    saveStoreChangeTokens: vi.fn(),
    setActiveTabKey: vi.fn(async (): Promise<boolean> => true),
    setTargetColor: vi.fn(async (): Promise<void> => undefined),
    setUnderlayer: vi.fn(async (): Promise<void> => undefined),
    ...createOriginalImageSlice(...args),
  }));
}

const dependency = {onMetadataChange: vi.fn()};
registerOriginalImageDependency(dependency);

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('original image slice', () => {
  it('clears the tonal-value filter when the selected image is cleared', async () => {
    const store = createTestStore();
    store.setState({selectedTonalValue: TonalValue.Shadows});

    await store.getState().selectImageFile(null);

    expect(store.getState().selectedTonalValue).toBeNull();
    expect(store.getState().saveStoreChangeTokens).not.toHaveBeenCalled();
    expect(store.getState().pushCloudState).not.toHaveBeenCalled();
  });

  it('appends a page when the existing digest sequence is unchanged', async () => {
    const first = recentImage('first');
    const second = recentImage('second');
    const store = createTestStore();
    store.setState({recentImages: [first], hasMoreRecentImages: true});
    dbOperations.getRecentImages.mockResolvedValueOnce({images: [first, second], hasMore: false});

    await store.getState().loadMoreRecentImages();

    expect(dbOperations.getRecentImages).toHaveBeenCalledWith(1, 12);
    expect(store.getState().recentImages).toEqual([first, second]);
    expect(store.getState().hasMoreRecentImages).toBe(false);
  });

  it('schedules a cloud push after saving a focal point', async () => {
    vi.useFakeTimers();
    const store = createTestStore();
    store.setState({recentImages: [recentImage('first')]});
    dbOperations.saveImageFocalPoint.mockResolvedValueOnce({images: 'token'});

    await store.getState().saveImageFocalPoint('first', {x: 0.5, y: 0.5});
    await vi.runAllTimersAsync();

    expect(store.getState().pushCloudState).toHaveBeenCalledOnce();
  });

  it('refreshes an externally changed focal point of the selected photo on reload', async () => {
    const selectedImageFile: ImageFile = {...recentImage('first'), blob: new Blob()};
    const store = createTestStore();
    store.setState({selectedImageFile});
    dbOperations.getRecentImages.mockResolvedValueOnce({images: [], hasMore: false});
    dbOperations.getImageMetadata.mockResolvedValueOnce({
      ...recentImage('first'),
      focalPoint: {x: 0.3, y: 0.4},
    });

    await store.getState().loadRecentImages();

    expect(dbOperations.getImageMetadata).toHaveBeenCalledExactlyOnceWith('first');
    expect(store.getState().selectedImageFile).toEqual({
      ...selectedImageFile,
      focalPoint: {x: 0.3, y: 0.4},
    });
    expect(dependency.onMetadataChange).toHaveBeenCalledOnce();
  });

  it('does not let a reload overwrite a pending local focal point', async () => {
    const selectedImageFile: ImageFile = {...recentImage('first'), blob: new Blob()};
    const store = createTestStore();
    store.setState({recentImages: [recentImage('first')], selectedImageFile});
    dbOperations.getRecentImages.mockResolvedValueOnce({images: [], hasMore: false});
    const metadataRead = Promise.withResolvers<RecentImage>();
    dbOperations.getImageMetadata.mockReturnValueOnce(metadataRead.promise);
    const focalPointSave = Promise.withResolvers<{images: string}>();
    dbOperations.saveImageFocalPoint.mockReturnValueOnce(focalPointSave.promise);

    const reload = store.getState().loadRecentImages();
    const save = store.getState().saveImageFocalPoint('first', {x: 0.75, y: 0.25});
    await vi.waitFor(() => {
      expect(dbOperations.getImageMetadata).toHaveBeenCalled();
    });
    metadataRead.resolve({...recentImage('first'), focalPoint: {x: 0.5, y: 0.5}});
    await reload;
    focalPointSave.resolve({images: 'token'});
    await save;

    expect(dependency.onMetadataChange).not.toHaveBeenCalled();
    expect(store.getState().selectedImageFile?.focalPoint).toEqual({x: 0.75, y: 0.25});
  });

  it('keeps the selected photo when its focal point is unchanged on reload', async () => {
    const selectedImageFile: ImageFile = {
      ...recentImage('first'),
      focalPoint: {x: 0.3, y: 0.4},
      blob: new Blob(),
    };
    const store = createTestStore();
    store.setState({selectedImageFile});
    dbOperations.getRecentImages.mockResolvedValueOnce({images: [], hasMore: false});
    dbOperations.getImageMetadata.mockResolvedValueOnce({
      ...recentImage('first'),
      focalPoint: {x: 0.3, y: 0.4},
    });

    await store.getState().loadRecentImages();

    expect(store.getState().selectedImageFile).toBe(selectedImageFile);
    expect(dependency.onMetadataChange).not.toHaveBeenCalled();
  });

  it('saves a focal point and updates only the matching photo in memory', async () => {
    const tokens = {images: 'token'};
    const first = recentImage('first');
    const second = {...recentImage('second'), focalPoint: {x: 0.1, y: 0.2}};
    const selectedImageFile: ImageFile = {...first, blob: new Blob()};
    const store = createTestStore();
    store.setState({recentImages: [first, second], selectedImageFile});
    dbOperations.saveImageFocalPoint.mockResolvedValueOnce(tokens);

    await store.getState().saveImageFocalPoint('first', {x: 0.5, y: 0.75});

    expect(dbOperations.saveImageFocalPoint).toHaveBeenCalledExactlyOnceWith('first', {
      x: 0.5,
      y: 0.75,
    });
    expect(store.getState().saveStoreChangeTokens).toHaveBeenCalledExactlyOnceWith(tokens);
    expect(store.getState().recentImages).toEqual([
      {...first, focalPoint: {x: 0.5, y: 0.75}},
      second,
    ]);
    expect(store.getState().selectedImageFile).toEqual({
      ...selectedImageFile,
      focalPoint: {x: 0.5, y: 0.75},
    });
  });

  it('removes a cleared focal point and keeps a different selected photo', async () => {
    const first = recentImage('first');
    const second = {...recentImage('second'), focalPoint: {x: 0.1, y: 0.2}};
    const selectedImageFile: ImageFile = {...first, blob: new Blob()};
    const store = createTestStore();
    store.setState({recentImages: [first, second], selectedImageFile});
    dbOperations.saveImageFocalPoint.mockResolvedValueOnce({images: 'token'});

    await store.getState().saveImageFocalPoint('second', null);

    expect(store.getState().recentImages).toEqual([first, recentImage('second')]);
    expect(store.getState().selectedImageFile).toBe(selectedImageFile);
  });
});
