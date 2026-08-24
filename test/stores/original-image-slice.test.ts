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

import type {RecentImage} from '@/services/image/image-file';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {ColorMixerSlice} from '@/stores/color-mixer-slice';
import {createOriginalImageSlice, type OriginalImageSlice} from '@/stores/original-image-slice';
import type {PaletteSlice} from '@/stores/palette-slice';
import type {TabSlice} from '@/stores/tab-slice';

const dbOperations = vi.hoisted(() => ({
  deleteImageFileAndColorMixturesByDigest: vi.fn(),
  getRecentImages: vi.fn(),
  hasImageFile: vi.fn(),
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
    'paletteColorMixtures' | 'selectedPaletteColorMixtures' | 'loadPaletteColorMixtures'
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
    loadPaletteColorMixtures: vi.fn(async (): Promise<void> => undefined),
    pushCloudState: vi.fn(async (): Promise<void> => undefined),
    saveStoreChangeTokens: vi.fn(),
    setActiveTabKey: vi.fn(async (): Promise<boolean> => true),
    setTargetColor: vi.fn(async (): Promise<void> => undefined),
    setUnderlayer: vi.fn(async (): Promise<void> => undefined),
    ...createOriginalImageSlice(...args),
  }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('original image slice', () => {
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
});
