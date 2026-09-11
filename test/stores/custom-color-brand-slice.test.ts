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

import {
  ColorOpacity,
  ColorType,
  type CustomColorBrandSource,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {saveAs} from 'file-saver';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {
  createCloudState,
  fromCustomColorBrandSource,
  serializeAndHashCloudState,
  toCustomColorBrandSource,
} from '@/services/cloud/cloud-state';
import {FileExtension} from '@/services/cloud/types';
import {saveCustomColorBrands} from '@/services/db/custom-brand-db';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {ColorSetSlice} from '@/stores/color-set-slice';
import {
  createCustomColorBrandSlice,
  type CustomColorBrandSlice,
} from '@/stores/custom-color-brand-slice';

vi.mock('file-saver', () => ({saveAs: vi.fn()}));
vi.mock('@/services/db/custom-brand-db', () => ({
  deleteCustomColorBrand: vi.fn(),
  getAllCustomColorBrands: vi.fn(),
  saveCustomColorBrands: vi.fn(),
}));

type TestStore = CustomColorBrandSlice &
  Pick<AppSlice, 'saveStoreChangeTokens'> &
  Pick<CloudSlice, 'pushCloudState'> &
  Pick<ColorSetSlice, 'loadColorSets'>;

function createTestStore() {
  return createStore<TestStore>()((...args) => ({
    saveStoreChangeTokens: vi.fn(),
    pushCloudState: vi.fn(async () => undefined),
    loadColorSets: vi.fn(async () => undefined),
    ...createCustomColorBrandSlice(...args),
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(saveCustomColorBrands).mockResolvedValue({});
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe('custom brand export', () => {
  it.each([0, -1, 1.5, 5, 100])(
    'exports legacy opacity %s as unspecified without changing stored or cloud data',
    async opacity => {
      const store = createTestStore();
      const source: CustomColorBrandSource = {
        id: 7,
        type: ColorType.WatercolorPaint,
        name: 'Legacy',
        colors: [{id: 1, name: 'Red', hex: '#ff0000', opacity: opacity}],
      };
      const stored = fromCustomColorBrandSource(source);
      store.setState({customColorBrands: [stored]});
      const cloudState = () =>
        createCloudState({
          customBrands: store.getState().customColorBrands,
          colorSets: [],
          images: [],
          colorMixtures: [],
        });
      const before = await serializeAndHashCloudState(cloudState());

      store.getState().exportCustomColorBrandToJson(toCustomColorBrandSource(stored));

      expect(saveAs).toHaveBeenCalledExactlyOnceWith(
        expect.any(Blob),
        `Legacy${FileExtension.CustomColorBrand}`
      );
      const blob = vi.mocked(saveAs).mock.calls[0]![0] as Blob;
      expect(JSON.parse(await blob.text())).toEqual({
        type: ColorType.WatercolorPaint,
        name: 'Legacy',
        colors: [{id: 1, name: 'Red', hex: '#ff0000'}],
      });
      expect(toCustomColorBrandSource(stored)).toEqual(source);
      expect(await serializeAndHashCloudState(cloudState())).toEqual(before);

      const imported = await store
        .getState()
        .importCustomColorBrandFromJson(
          new File([blob], `Legacy${FileExtension.CustomColorBrand}`)
        );

      expect(imported?.colors?.[0]).toMatchObject({id: 1, name: 'Red', hex: '#ff0000'});
      expect(imported?.colors?.[0]?.opacity).toBeUndefined();
      expect(saveCustomColorBrands).toHaveBeenCalledExactlyOnceWith([imported]);
    }
  );

  it.each([
    undefined,
    ColorOpacity.Transparent,
    ColorOpacity.SemiTransparent,
    ColorOpacity.SemiOpaque,
    ColorOpacity.Opaque,
  ])('preserves supported or unspecified opacity %s across export and import', async opacity => {
    const store = createTestStore();
    const source: CustomColorBrandSource = {
      type: ColorType.OilPaint,
      name: 'Custom',
      colors: [{id: 1, name: 'Red', hex: '#ff0000', opacity}],
    };

    store.getState().exportCustomColorBrandToJson(source);
    const blob = vi.mocked(saveAs).mock.calls[0]![0] as Blob;
    const imported = await store
      .getState()
      .importCustomColorBrandFromJson(new File([blob], `Custom${FileExtension.CustomColorBrand}`));

    expect(imported?.colors?.[0]?.opacity).toBe(opacity);
    expect(saveCustomColorBrands).toHaveBeenCalledExactlyOnceWith([imported]);
  });
});
