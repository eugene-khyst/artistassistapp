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

import {ImageEditorKey} from '@/image-editor';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {SharpenMode} from '@/services/image/sharpen-controls';
import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import type {AppSlice} from '@/stores/app-slice';
import type {EditImageOperation, EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import {createSharpenSlice, type SharpenSlice} from '@/stores/sharpen-slice';

type TestStore = SharpenSlice &
  Pick<AppSlice, 'appSettings' | 'saveAppSettings'> &
  Pick<EditImageSlice, 'editImageOperation'>;

function createTestStore() {
  const saveAppSettings = vi.fn(async (settings: Partial<AppSlice['appSettings']>) => {
    const appSettings = {...store.getState().appSettings, ...settings};
    store.setState({appSettings});
    return appSettings;
  });
  const preview = vi.fn().mockResolvedValue(true);
  const editImageOperation: EditImageOperation = {
    withEditedImage: vi.fn() as EditImageOperation['withEditedImage'],
    preview,
    execute: vi.fn(),
    abort: vi.fn(),
  };
  const store = createStore<TestStore>()((...args) => ({
    appSettings: DEFAULT_APP_SETTINGS,
    saveAppSettings,
    editImageOperation,
    ...createSharpenSlice(...args),
  }));
  return {store, preview, saveAppSettings};
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('sharpen slice', () => {
  it('stores only the mode and resets strength', () => {
    const {store, saveAppSettings} = createTestStore();

    store.getState().setSharpenControls({strength: 4});

    expect(saveAppSettings).not.toHaveBeenCalled();

    store.getState().setSharpenControls({mode: SharpenMode.HighPass});

    expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({sharpenMode: SharpenMode.HighPass});

    imageEditorControls.reset(ImageEditorKey.Sharpen);

    expect(store.getState().sharpenControls).toEqual({mode: SharpenMode.HighPass, strength: 1});
  });

  it('loads the mode from settings and restores controls from a command', () => {
    const {store, saveAppSettings} = createTestStore();
    const appSettings = {...DEFAULT_APP_SETTINGS, sharpenMode: SharpenMode.HighPass};
    store.setState({appSettings});
    store.getState().setSharpenControls({strength: 4});

    store.getState().loadSharpenSettings(appSettings);

    expect(store.getState().sharpenControls).toEqual({mode: SharpenMode.HighPass, strength: 4});
    expect(saveAppSettings).not.toHaveBeenCalled();

    imageEditorControls.restore(ImageEditorKey.Sharpen, {
      type: EditImageCommandType.Sharpen,
      controls: {mode: SharpenMode.UnsharpMask, strength: 3},
    });

    expect(store.getState().sharpenControls).toEqual({mode: SharpenMode.UnsharpMask, strength: 3});
  });

  it('uses the default mode when the stored mode is invalid', () => {
    const {store} = createTestStore();

    store.getState().loadSharpenSettings({...DEFAULT_APP_SETTINGS, sharpenMode: 'invalid'});

    expect(store.getState().sharpenControls).toEqual({
      mode: SharpenMode.UnsharpMask,
      strength: 1,
    });
  });

  it('previews a command with a copy of its controls', async () => {
    const {store, preview} = createTestStore();
    store.getState().setSharpenControls({strength: 2});

    await store.getState().sharpenImage();

    expect(preview).toHaveBeenCalledExactlyOnceWith({
      type: EditImageCommandType.Sharpen,
      controls: {mode: SharpenMode.UnsharpMask, strength: 2},
    });
  });
});
