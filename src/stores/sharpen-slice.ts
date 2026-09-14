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

import {ImageEditorKey} from '@/image-editor';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {
  defaultSharpenControls,
  type SharpenControls,
  sharpenControlsFromAppSettings,
  sharpenControlsToAppSettings,
} from '@/services/image/sharpen-controls';
import {type AppSettings} from '@/services/settings/types';
import {type AppSlice} from '@/stores/app-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';

export interface SharpenSlice {
  sharpenControls: SharpenControls;

  loadSharpenSettings: (appSettings: AppSettings) => void;
  setSharpenControls: (controls: Partial<SharpenControls>) => void;
  sharpenImage: () => Promise<void>;
}

type SharpenSliceDependencies = Pick<AppSlice, 'appSettings' | 'saveAppSettings'> &
  Pick<EditImageSlice, 'editImageOperation'>;

export const createSharpenSlice: StateCreator<
  SharpenSlice & SharpenSliceDependencies,
  [],
  [],
  SharpenSlice
> = (set, get) => {
  const resetSharpen = (): void => {
    set({
      sharpenControls: {
        ...defaultSharpenControls(),
        ...sharpenControlsFromAppSettings(get().appSettings),
      },
    });
  };

  imageEditorControls.register(ImageEditorKey.Sharpen, {
    reset: resetSharpen,
    restore: command => {
      if (command.type === EditImageCommandType.Sharpen) {
        set({
          sharpenControls: {...command.controls},
        });
      }
    },
  });

  return {
    sharpenControls: defaultSharpenControls(),

    loadSharpenSettings: (appSettings: AppSettings): void => {
      set(({sharpenControls}) => ({
        sharpenControls: {
          ...sharpenControls,
          ...sharpenControlsFromAppSettings(appSettings),
        },
      }));
    },

    setSharpenControls: (controls: Partial<SharpenControls>): void => {
      const sharpenControls = {
        ...get().sharpenControls,
        ...controls,
      };
      set({
        sharpenControls,
      });
      const appSettings = sharpenControlsToAppSettings(controls);
      if (Object.keys(appSettings).length > 0) {
        void get().saveAppSettings(appSettings);
      }
    },

    sharpenImage: async (): Promise<void> => {
      await get().editImageOperation.preview({
        type: EditImageCommandType.Sharpen,
        controls: {...get().sharpenControls},
      });
    },
  };
};
