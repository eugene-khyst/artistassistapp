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

import {type AppSettings, DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import type {AppSlice} from '@/stores/app-slice';
import type {BlurredImagesSlice} from '@/stores/blurred-images-slice';
import type {OutlineImageSlice} from '@/stores/outline-image-slice';
import type {StorageSlice} from '@/stores/storage-slice';
import type {StyleTransferSlice} from '@/stores/style-transfer-slice';
import {createTabSlice, type TabSlice, type UnsavedChangesChecker} from '@/stores/tab-slice';
import type {TonalImagesSlice} from '@/stores/tonal-images-slice';
import {TabKey} from '@/tabs';

type TestStore = TabSlice &
  Pick<AppSlice, 'saveAppSettings'> &
  Pick<TonalImagesSlice, 'loadTonalImages'> &
  Pick<BlurredImagesSlice, 'loadBlurredImages'> &
  Pick<OutlineImageSlice, 'loadOutlineImage'> &
  Pick<StyleTransferSlice, 'loadStyledImage'> &
  Pick<StorageSlice, 'loadStorageUsage'>;

function createTestStore() {
  const saveAppSettings = vi.fn(
    async (_update: Parameters<AppSlice['saveAppSettings']>[0]): Promise<AppSettings> =>
      DEFAULT_APP_SETTINGS
  );
  const store = createStore<TestStore>()((...args) => ({
    saveAppSettings,
    loadTonalImages: vi.fn(),
    loadBlurredImages: vi.fn(async (): Promise<void> => undefined),
    loadOutlineImage: vi.fn(async (): Promise<void> => undefined),
    loadStyledImage: vi.fn(async (): Promise<void> => undefined),
    loadStorageUsage: vi.fn(async (): Promise<void> => undefined),
    ...createTabSlice(...args),
  }));
  return {saveAppSettings, store};
}

const unregisterCallbacks: (() => void)[] = [];

function registerChecker(
  store: ReturnType<typeof createTestStore>['store'],
  tabKey: TabKey,
  checker: UnsavedChangesChecker
): () => void {
  const unregister = store.getState().registerUnsavedChangesChecker(tabKey, checker);
  unregisterCallbacks.push(unregister);
  return unregister;
}

afterEach(() => {
  for (const unregister of unregisterCallbacks.splice(0)) {
    unregister();
  }
});

describe('tab slice', () => {
  it('does nothing when the requested tab is already active', async () => {
    const {saveAppSettings, store} = createTestStore();
    const checker = vi.fn(async (): Promise<boolean> => false);
    registerChecker(store, TabKey.ColorSet, checker);

    await expect(store.getState().setActiveTabKey(TabKey.ColorSet)).resolves.toBe(true);

    expect(checker).not.toHaveBeenCalled();
    expect(saveAppSettings).not.toHaveBeenCalled();
  });

  it('blocks a tab change when an active-tab checker returns false', async () => {
    const {saveAppSettings, store} = createTestStore();
    const checker = vi.fn(async (): Promise<boolean> => false);
    registerChecker(store, TabKey.ColorSet, checker);

    await expect(store.getState().setActiveTabKey(TabKey.Photo)).resolves.toBe(false);

    expect(checker).toHaveBeenCalledOnce();
    expect(saveAppSettings).not.toHaveBeenCalled();
    expect(store.getState().activeTabKey).toBe(TabKey.ColorSet);
  });

  it('checks only the tab being left', async () => {
    const {saveAppSettings, store} = createTestStore();
    const sourceChecker = vi.fn(async (): Promise<boolean> => true);
    const destinationChecker = vi.fn(async (): Promise<boolean> => false);
    registerChecker(store, TabKey.ColorSet, sourceChecker);
    registerChecker(store, TabKey.Photo, destinationChecker);

    await expect(store.getState().setActiveTabKey(TabKey.Photo)).resolves.toBe(true);

    expect(sourceChecker).toHaveBeenCalledOnce();
    expect(destinationChecker).not.toHaveBeenCalled();
    expect(saveAppSettings).toHaveBeenCalledWith({activeTabKey: TabKey.Photo});
    expect(store.getState().activeTabKey).toBe(TabKey.Photo);
  });

  it('does not run an unregistered checker', async () => {
    const {saveAppSettings, store} = createTestStore();
    const checker = vi.fn(async (): Promise<boolean> => false);
    const unregister = registerChecker(store, TabKey.ColorSet, checker);
    unregister();

    await expect(store.getState().setActiveTabKey(TabKey.Photo)).resolves.toBe(true);

    expect(checker).not.toHaveBeenCalled();
    expect(saveAppSettings).toHaveBeenCalledOnce();
  });

  it('can skip the unsaved changes check explicitly', async () => {
    const {saveAppSettings, store} = createTestStore();
    const checker = vi.fn(async (): Promise<boolean> => false);
    registerChecker(store, TabKey.ColorSet, checker);

    await expect(
      store.getState().setActiveTabKey(TabKey.Photo, {skipUnsavedChangesCheck: true})
    ).resolves.toBe(true);

    expect(checker).not.toHaveBeenCalled();
    expect(saveAppSettings).toHaveBeenCalledOnce();
    expect(store.getState().activeTabKey).toBe(TabKey.Photo);
  });

  it('stops checking after a checker blocks the tab change', async () => {
    const {saveAppSettings, store} = createTestStore();
    const blockingChecker = vi.fn(async (): Promise<boolean> => false);
    const laterChecker = vi.fn(async (): Promise<boolean> => true);
    registerChecker(store, TabKey.ColorSet, blockingChecker);
    registerChecker(store, TabKey.ColorSet, laterChecker);

    await expect(store.getState().setActiveTabKey(TabKey.Photo)).resolves.toBe(false);

    expect(blockingChecker).toHaveBeenCalledOnce();
    expect(laterChecker).not.toHaveBeenCalled();
    expect(saveAppSettings).not.toHaveBeenCalled();
    expect(store.getState().activeTabKey).toBe(TabKey.ColorSet);
  });

  it('accepts a new tab change after a settings error', async () => {
    const {saveAppSettings, store} = createTestStore();
    const error = new Error('settings failed');
    saveAppSettings.mockRejectedValueOnce(error).mockResolvedValueOnce(DEFAULT_APP_SETTINGS);

    await expect(store.getState().setActiveTabKey(TabKey.Photo)).rejects.toBe(error);
    await expect(store.getState().setActiveTabKey(TabKey.Palette)).resolves.toBe(true);
    expect(store.getState().activeTabKey).toBe(TabKey.Palette);
  });
});
