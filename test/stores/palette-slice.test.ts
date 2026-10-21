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

import {expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {TonalValue} from '@/services/color/tonal-value';
import {createPaletteSlice} from '@/stores/palette-slice';

type TestStore = ReturnType<Parameters<typeof createPaletteSlice>[1]>;

it('changes the tonal-value filter without persisting it', () => {
  const store = createStore<TestStore>()((...args) => ({
    colorSet: null,
    samplingArea: null,
    selectedImageFile: null,
    saveStoreChangeTokens: vi.fn(),
    pushCloudState: vi.fn(),
    ...createPaletteSlice(...args),
  }));
  store.getState().setSelectedTonalValue(TonalValue.Shadows);
  expect(store.getState().selectedTonalValue).toBe(TonalValue.Shadows);

  store.getState().setSelectedTonalValue(null);

  expect(store.getState().selectedTonalValue).toBeNull();
  expect(store.getState().saveStoreChangeTokens).not.toHaveBeenCalled();
  expect(store.getState().pushCloudState).not.toHaveBeenCalled();
});
