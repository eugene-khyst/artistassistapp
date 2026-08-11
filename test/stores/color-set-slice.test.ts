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

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {AuthErrorType, ForceLogoutError} from '@/services/auth/errors';
import {fetchColorBrands, fetchColorsBulk} from '@/services/color/color-queries';
import {toColorSet} from '@/services/color/colors';
import {ColorType, type ColorSetDefinition} from '@/services/color/types';
import {getAllColorSets} from '@/services/db/color-set-db';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import type {ColorMixerSlice} from '@/stores/color-mixer-slice';
import {createColorSetSlice, type ColorSetSlice} from '@/stores/color-set-slice';
import {createAbortError} from '@/utils/promise';

vi.mock('@/services/db/color-set-db', () => ({
  deleteColorSet: vi.fn(),
  getAllColorSets: vi.fn(),
  saveColorSets: vi.fn(),
}));

vi.mock('@/services/color/color-queries', () => ({
  fetchColorBrands: vi.fn(),
  fetchColorsBulk: vi.fn(),
}));

vi.mock('@/services/color/colors', () => ({
  toColorSet: vi.fn(),
}));

const savedColorSet: ColorSetDefinition = {
  id: 1,
  type: ColorType.WatercolorPaint,
  brands: [1],
  date: new Date('2026-01-01T00:00:00Z'),
};

function abortsWith(signal?: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal?.addEventListener(
      'abort',
      () => {
        reject(createAbortError(signal.reason));
      },
      {once: true}
    );
  });
}

type TestStore = ColorSetSlice &
  Pick<AppSlice, 'saveStoreChangeTokens'> &
  Pick<AuthSlice, 'auth' | 'logout'> &
  Pick<CloudSlice, 'pushCloudState'> &
  Pick<ColorMixerSlice, 'setColorSet'>;

function createTestStore() {
  return createStore<TestStore>()((...args) => ({
    auth: null,
    logout: vi.fn(async (): Promise<void> => undefined),
    pushCloudState: vi.fn(async (): Promise<void> => undefined),
    saveStoreChangeTokens: vi.fn(),
    setColorSet: vi.fn(async (): Promise<void> => undefined),
    ...createColorSetSlice(...args),
  }));
}

beforeEach(() => {
  vi.mocked(getAllColorSets).mockReset();
  vi.mocked(fetchColorBrands).mockReset();
  vi.mocked(fetchColorsBulk).mockReset().mockResolvedValue(new Map());
  vi.mocked(toColorSet).mockReset().mockReturnValue(null);
});

describe('color set slice', () => {
  it('gets the latest color set by date and id', () => {
    const store = createTestStore();
    const colorSets: ColorSetDefinition[] = [
      {
        id: 1,
        type: ColorType.WatercolorPaint,
        date: new Date('2026-01-01T00:00:00Z'),
      },
      {
        id: 3,
        type: ColorType.WatercolorPaint,
        date: new Date('2026-01-02T00:00:00Z'),
      },
      {
        id: 2,
        type: ColorType.WatercolorPaint,
        date: new Date('2026-01-02T00:00:00Z'),
      },
    ];
    store.setState({
      colorSets: new Map([[ColorType.WatercolorPaint, colorSets]]),
    });

    expect(store.getState().getLatestColorSet()).toBe(colorSets[1]);
  });

  it('increments the reload revision after every successful load', async () => {
    vi.mocked(getAllColorSets).mockResolvedValue([]);
    const store = createTestStore();

    await store.getState().loadColorSets();
    await store.getState().loadColorSets();

    expect(store.getState().colorSetsReloadRevision).toBe(2);
  });

  it('does not increment the reload revision after a failed load', async () => {
    const error = new Error('load failed');
    vi.mocked(getAllColorSets).mockRejectedValue(error);
    const store = createTestStore();

    await expect(store.getState().loadColorSets()).rejects.toBe(error);

    expect(store.getState().colorSetsReloadRevision).toBe(0);
    expect(store.getState().isColorSetsLoading).toBe(false);
  });

  it('reports an activation failure and clears the loading flag', async () => {
    vi.mocked(fetchColorBrands).mockRejectedValue(new Error('data unavailable'));
    const store = createTestStore();
    store.setState({colorSets: new Map([[ColorType.WatercolorPaint, [savedColorSet]]])});

    await store.getState().activateLatestColorSet();

    expect(store.getState().colorSetActivationError).toEqual(new Error('data unavailable'));
    expect(store.getState().isColorSetActivationLoading).toBe(false);
  });

  it('aborts the in-flight fetch when a newer activation supersedes it', async () => {
    vi.mocked(fetchColorBrands)
      .mockImplementationOnce((_type, signal) => abortsWith(signal))
      .mockResolvedValue([{id: 1, alias: 'test', fullName: 'Test'}]);
    const store = createTestStore();
    store.setState({colorSets: new Map([[ColorType.WatercolorPaint, [savedColorSet]]])});

    const superseded = store.getState().activateLatestColorSet();
    await store.getState().activateLatestColorSet();
    await superseded;

    expect(vi.mocked(fetchColorBrands).mock.calls[0]?.[1]?.aborted).toBe(true);
  });

  it('ignores a non-abort rejection from a superseded activation', async () => {
    vi.mocked(fetchColorBrands).mockResolvedValue([{id: 1, alias: 'test', fullName: 'Test'}]);
    let failSupersededSetColorSet: (error: unknown) => void = () => undefined;
    const supersededSetColorSet = new Promise<void>((_, reject) => {
      failSupersededSetColorSet = reject;
    });
    const setColorSet = vi
      .fn<() => Promise<void>>()
      .mockReturnValueOnce(supersededSetColorSet)
      .mockResolvedValue(undefined);
    const store = createTestStore();
    store.setState({
      colorSets: new Map([[ColorType.WatercolorPaint, [savedColorSet]]]),
      setColorSet,
    });

    const superseded = store.getState().activateLatestColorSet();
    await vi.waitFor(() => {
      expect(setColorSet).toHaveBeenCalledOnce();
    });
    await store.getState().activateLatestColorSet();
    failSupersededSetColorSet(new Error('stale failure'));
    await superseded;

    expect(store.getState().colorSetActivationError).toBeNull();
    expect(store.getState().isColorSetActivationLoading).toBe(false);
  });

  it('logs out instead of reporting a force logout as an activation error', async () => {
    vi.mocked(fetchColorBrands).mockRejectedValue(
      new ForceLogoutError(AuthErrorType.InvalidToken, 'Invalid token')
    );
    const store = createTestStore();
    store.setState({colorSets: new Map([[ColorType.WatercolorPaint, [savedColorSet]]])});

    await store.getState().activateLatestColorSet();

    expect(store.getState().logout).toHaveBeenCalledWith(AuthErrorType.InvalidToken);
    expect(store.getState().colorSetActivationError).toBeNull();
  });

  it('clears a previous activation error when a new activation starts', async () => {
    vi.mocked(fetchColorBrands).mockRejectedValueOnce(new Error('data unavailable'));
    const store = createTestStore();
    store.setState({colorSets: new Map([[ColorType.WatercolorPaint, [savedColorSet]]])});
    await store.getState().activateLatestColorSet();

    vi.mocked(fetchColorBrands).mockResolvedValue([{id: 1, alias: 'test', fullName: 'Test'}]);
    await store.getState().activateLatestColorSet();

    expect(store.getState().colorSetActivationError).toBeNull();
    expect(fetchColorsBulk).toHaveBeenCalledOnce();
  });
});
