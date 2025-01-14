/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {TabKey} from '~/src/tabs';

import type {BlurredImagesSlice} from './blurred-images-slice';
import type {OutlineImageSlice} from './outline-image-slice';
import type {StorageSlice} from './storage-slice';
import type {StyleTransferSlice} from './style-transfer-slice';
import type {TonalImagesSlice} from './tonal-images-slice';

export interface TabSlice {
  activeTabKey: TabKey;

  setActiveTabKey: (activeTabKey: TabKey) => Promise<void>;
}

export const createTabSlice: StateCreator<
  TabSlice &
    TonalImagesSlice &
    BlurredImagesSlice &
    OutlineImageSlice &
    StyleTransferSlice &
    StorageSlice,
  [],
  [],
  TabSlice
> = (set, get) => ({
  activeTabKey: TabKey.ColorSet,

  setActiveTabKey: async (activeTabKey: TabKey): Promise<void> => {
    await saveAppSettings({activeTabKey});
    set({activeTabKey});
    if (activeTabKey === TabKey.TonalValues) {
      void get().loadTonalImages();
    } else if (activeTabKey === TabKey.SimplifiedPhoto) {
      void get().loadBlurredImages();
    } else if (activeTabKey === TabKey.Outline) {
      void get().loadOutlineImage();
    } else if (activeTabKey === TabKey.StyleTransfer) {
      get().loadImageFileToStyle();
    } else if (activeTabKey === TabKey.Help) {
      void get().loadStorageUsage();
    }
  },
});
