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

import type {StateCreator} from 'zustand';

import type {AppSlice} from '@/stores/app-slice';
import {DEFAULT_TAB_KEY, TabKey} from '@/tabs';
import {blurFocusedElementIn} from '@/utils/focus';

import type {OutlineImageSlice} from './outline-image-slice';
import type {SimplifyImageSlice} from './simplify-image-slice';
import type {StorageSlice} from './storage-slice';
import type {StyleTransferSlice} from './style-transfer-slice';
import type {TonalValuesSlice} from './tonal-values-slice';

export type UnsavedChangesChecker = () => Promise<boolean>;

const unsavedChangesCheckers = new Map<TabKey, Set<UnsavedChangesChecker>>();

type TabSliceDependencies = Pick<AppSlice, 'saveAppSettings'> &
  Pick<TonalValuesSlice, 'loadTonalImages'> &
  Pick<SimplifyImageSlice, 'loadSimplifiedImages'> &
  Pick<OutlineImageSlice, 'loadOutlineImage'> &
  Pick<StyleTransferSlice, 'transferStyle'> &
  Pick<StorageSlice, 'loadStorageUsage'>;

export interface TabSlice {
  activeTabKey: TabKey;

  registerUnsavedChangesChecker: (tabKey: TabKey, checker: UnsavedChangesChecker) => () => void;
  setActiveTabKey: (
    activeTabKey: TabKey,
    options?: {skipUnsavedChangesCheck?: boolean}
  ) => Promise<boolean>;
}

export const createTabSlice: StateCreator<TabSlice & TabSliceDependencies, [], [], TabSlice> = (
  set,
  get
) => ({
  activeTabKey: DEFAULT_TAB_KEY,

  registerUnsavedChangesChecker: (tabKey: TabKey, checker: UnsavedChangesChecker): (() => void) => {
    const checkers = unsavedChangesCheckers.get(tabKey) ?? new Set<UnsavedChangesChecker>();
    checkers.add(checker);
    unsavedChangesCheckers.set(tabKey, checkers);
    return () => {
      checkers.delete(checker);
      if (checkers.size === 0) {
        unsavedChangesCheckers.delete(tabKey);
      }
    };
  },
  setActiveTabKey: async (
    activeTabKey: TabKey,
    {skipUnsavedChangesCheck = false} = {}
  ): Promise<boolean> => {
    const currentTabKey = get().activeTabKey;
    if (activeTabKey === currentTabKey) {
      return true;
    }
    if (!skipUnsavedChangesCheck) {
      for (const checker of unsavedChangesCheckers.get(currentTabKey) ?? []) {
        if (!(await checker())) {
          return false;
        }
      }
    }
    await get().saveAppSettings({activeTabKey});
    blurFocusedElementIn('[role="tabpanel"]');
    set({
      activeTabKey,
    });
    if (activeTabKey === TabKey.TonalValues) {
      get().loadTonalImages();
    } else if (activeTabKey === TabKey.Simplify) {
      void get().loadSimplifiedImages();
    } else if (activeTabKey === TabKey.Outline) {
      void get().loadOutlineImage();
    } else if (activeTabKey === TabKey.StyleTransfer) {
      void get().transferStyle();
    } else if (activeTabKey === TabKey.Help) {
      void get().loadStorageUsage();
    }
    return true;
  },
});
