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

import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import {type ColorizeSlice, createColorizeSlice} from '@/stores/colorize-slice';
import type {
  EditImageCommandSupplier,
  EditImageContext,
  EditImageOperation,
  EditImageSlice,
} from '@/stores/edit-image-slice';

const colorizeMocks = vi.hoisted(() => ({createColorizedImage: vi.fn()}));

vi.mock('@/i18n', () => ({
  formatFetchProgress: vi.fn(),
}));

vi.mock('@/services/image/colorize', () => ({
  createColorizedImage: colorizeMocks.createColorizedImage,
}));

const COLORIZE_MODEL = {id: 'ddcolor', freeTier: true} as OnnxModel;
const UPSCALE_MODEL = {id: 'real-esrgan', freeTier: true} as OnnxModel;

function createImage(): ImageBitmap {
  return {width: 100, height: 100, close: vi.fn()};
}

type TestStore = ColorizeSlice &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation'>;

function createTestStore(image: ImageBitmap) {
  let executedCommand: EditImageCommand | null = null;
  const execute = vi.fn(
    async (commandOrSupplier: EditImageCommand | EditImageCommandSupplier): Promise<boolean> => {
      executedCommand =
        typeof commandOrSupplier === 'function'
          ? await commandOrSupplier({
              image,
              signal: new AbortController().signal,
              setDownloadTip: vi.fn(),
              setProcessTip: vi.fn(),
            } satisfies EditImageContext<ImageBitmap>)
          : commandOrSupplier;
      return !!executedCommand;
    }
  );
  const editImageOperation: EditImageOperation = {
    withEditedImage: vi.fn(),
    preview: vi.fn(),
    execute,
    abort: vi.fn(),
  };
  const store = createStore<TestStore>()((...args) => ({
    auth: null,
    editImageOperation,
    ...createColorizeSlice(...args),
  }));
  return {store, execute, getExecutedCommand: () => executedCommand};
}

function selectModels(store: ReturnType<typeof createTestStore>['store']): void {
  store.getState().setColorizeModel(COLORIZE_MODEL);
  store.getState().setColorizeUpscaleModel(UPSCALE_MODEL);
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('ColorizeSlice', () => {
  it('produces a Colorize command from the blob and closes the copied image', async () => {
    const inputImage = createImage();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValueOnce(inputImage));
    const result = new Blob();
    colorizeMocks.createColorizedImage.mockResolvedValueOnce(result);
    const {store, getExecutedCommand} = createTestStore(createImage());
    selectModels(store);

    await store.getState().colorizeImage();

    expect(getExecutedCommand()).toEqual({type: EditImageCommandType.Colorize, result});
    expect(colorizeMocks.createColorizedImage).toHaveBeenCalledWith(
      expect.objectContaining({
        image: inputImage,
        colorizeModel: COLORIZE_MODEL,
        upscaleModel: UPSCALE_MODEL,
      })
    );
    // The copy exists so a superseding edit cannot close the image mid-inference.
    expect(inputImage.close).toHaveBeenCalledOnce();
  });

  it('closes the copied image even when colorizing fails', async () => {
    const inputImage = createImage();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValueOnce(inputImage));
    colorizeMocks.createColorizedImage.mockRejectedValueOnce(new Error('inference failed'));
    const {store} = createTestStore(createImage());
    selectModels(store);

    await expect(store.getState().colorizeImage()).rejects.toThrow('inference failed');
    expect(inputImage.close).toHaveBeenCalledOnce();
  });

  /** Colorization runs the upscale model as a cleanup pass, so it needs both. */
  it.each([
    ['the colorization model is missing', false, true],
    ['the upscale model is missing', true, false],
    ['neither model is there', false, false],
  ])('does nothing when %s', async (_name, hasColorize, hasUpscale) => {
    const {store, execute} = createTestStore(createImage());
    if (hasColorize) {
      store.getState().setColorizeModel(COLORIZE_MODEL);
    }
    if (hasUpscale) {
      store.getState().setColorizeUpscaleModel(UPSCALE_MODEL);
    }

    await store.getState().colorizeImage();

    expect(execute).not.toHaveBeenCalled();
    expect(colorizeMocks.createColorizedImage).not.toHaveBeenCalled();
  });

  it('does nothing without access to both models', async () => {
    const {store, execute} = createTestStore(createImage());
    store.getState().setColorizeModel(COLORIZE_MODEL);
    store.getState().setColorizeUpscaleModel({id: 'paid', freeTier: false} as OnnxModel);

    await store.getState().colorizeImage();

    expect(execute).not.toHaveBeenCalled();
  });

  /** A model swapped while inference runs makes the result belong to the wrong request. */
  it.each([
    ['colorization', () => ({colorizeModel: {id: 'other', freeTier: true} as OnnxModel})],
    ['upscale', () => ({colorizeUpscaleModel: {id: 'other', freeTier: true} as OnnxModel})],
  ])('discards a result once the %s model changed', async (_name, change) => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(createImage()));
    const {store, getExecutedCommand} = createTestStore(createImage());
    selectModels(store);
    colorizeMocks.createColorizedImage.mockImplementationOnce(() => {
      store.setState(change());
      return Promise.resolve(new Blob());
    });

    await expect(store.getState().colorizeImage()).rejects.toThrow();
    expect(getExecutedCommand()).toBeNull();
  });

  it('ignores a set of the model it already has', () => {
    const {store} = createTestStore(createImage());
    store.getState().setColorizeModel(COLORIZE_MODEL);
    const before = store.getState();

    store.getState().setColorizeModel(COLORIZE_MODEL);

    expect(store.getState()).toBe(before);
  });
});
