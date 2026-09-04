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
import type {
  EditImageCommandSupplier,
  EditImageContext,
  EditImageOperation,
  EditImageSlice,
} from '@/stores/edit-image-slice';
import {createUpscaleSlice, type UpscaleSlice} from '@/stores/upscale-slice';
import {PROCESSING_PROGRESS_KEY} from '@/utils/fetch';

const upscaleMocks = vi.hoisted(() => ({
  createUpscaledImage: vi.fn(),
  upscaleFactor: vi.fn(),
}));

vi.mock('@/i18n', () => ({
  formatFetchProgress: vi.fn((key: string) => `downloading ${key}`),
  formatProcessProgress: vi.fn((progress: number) => `processing ${progress}`),
}));

vi.mock('@/services/image/upscale', () => ({
  createUpscaledImage: upscaleMocks.createUpscaledImage,
  upscaleFactor: upscaleMocks.upscaleFactor,
}));

const MODEL = {id: 'real-esrgan', freeTier: true} as OnnxModel;

function createImage(): ImageBitmap {
  return {width: 100, height: 100, close: vi.fn()};
}

type TestStore = UpscaleSlice &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'hasEditedImageAlpha'>;

function createTestStore(image: ImageBitmap, hasAlpha = false) {
  let executedCommand: EditImageCommand | null = null;
  const setDownloadTip = vi.fn();
  const setProcessTip = vi.fn();
  const execute = vi.fn(
    async (commandOrSupplier: EditImageCommand | EditImageCommandSupplier): Promise<boolean> => {
      executedCommand =
        typeof commandOrSupplier === 'function'
          ? await commandOrSupplier({
              image,
              signal: new AbortController().signal,
              setDownloadTip,
              setProcessTip,
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
    hasEditedImageAlpha: () => hasAlpha,
    ...createUpscaleSlice(...args),
  }));
  return {store, execute, setDownloadTip, setProcessTip, getExecutedCommand: () => executedCommand};
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('UpscaleSlice', () => {
  it('produces an Upscale command at the factor the image allows', async () => {
    const inputImage = createImage();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValueOnce(inputImage));
    upscaleMocks.upscaleFactor.mockReturnValueOnce(4);
    const result = new Blob();
    upscaleMocks.createUpscaledImage.mockResolvedValueOnce(result);
    const {store, getExecutedCommand} = createTestStore(createImage(), true);
    store.getState().setUpscaleModel(MODEL);

    await store.getState().upscaleImage();

    expect(getExecutedCommand()).toEqual({type: EditImageCommandType.Upscale, result});
    expect(upscaleMocks.createUpscaledImage).toHaveBeenCalledWith(
      expect.objectContaining({image: inputImage, factor: 4, transparent: true, model: MODEL})
    );
    expect(inputImage.close).toHaveBeenCalledOnce();
  });

  /** Alpha decides whether the upscaled result is masked back to the source shape. */
  it('reports an opaque image as not transparent', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(createImage()));
    upscaleMocks.upscaleFactor.mockReturnValueOnce(2);
    upscaleMocks.createUpscaledImage.mockResolvedValueOnce(new Blob());
    const {store} = createTestStore(createImage(), false);
    store.getState().setUpscaleModel(MODEL);

    await store.getState().upscaleImage();

    expect(upscaleMocks.createUpscaledImage).toHaveBeenCalledWith(
      expect.objectContaining({transparent: false})
    );
  });

  it('produces no command when the image has no room to grow', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn());
    upscaleMocks.upscaleFactor.mockReturnValueOnce(null);
    const {store, getExecutedCommand} = createTestStore(createImage());
    store.getState().setUpscaleModel(MODEL);

    await store.getState().upscaleImage();

    expect(getExecutedCommand()).toBeNull();
    expect(upscaleMocks.createUpscaledImage).not.toHaveBeenCalled();
    // The image is only copied once it is worth running the model.
    expect(createImageBitmap).not.toHaveBeenCalled();
  });

  it.each([
    ['no model is selected', undefined],
    ['the model is out of reach', {id: 'paid', freeTier: false} as OnnxModel],
  ])('does nothing when %s', async (_name, model) => {
    const {store, execute} = createTestStore(createImage());
    store.getState().setUpscaleModel(model);

    await store.getState().upscaleImage();

    expect(execute).not.toHaveBeenCalled();
    expect(upscaleMocks.createUpscaledImage).not.toHaveBeenCalled();
  });

  it('discards a result once the model changed', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(createImage()));
    upscaleMocks.upscaleFactor.mockReturnValueOnce(4);
    const {store, getExecutedCommand} = createTestStore(createImage());
    store.getState().setUpscaleModel(MODEL);
    upscaleMocks.createUpscaledImage.mockImplementationOnce(() => {
      store.getState().setUpscaleModel({id: 'other', freeTier: true} as OnnxModel);
      return Promise.resolve(new Blob());
    });

    await expect(store.getState().upscaleImage()).rejects.toThrow();
    expect(getExecutedCommand()).toBeNull();
  });

  /** Download and inference report through the same callback and must not share a tip. */
  it('separates inference progress from download progress', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(createImage()));
    upscaleMocks.upscaleFactor.mockReturnValueOnce(4);
    upscaleMocks.createUpscaledImage.mockImplementationOnce(
      ({progressCallback}: {progressCallback: (key: string, progress?: number) => void}) => {
        progressCallback('model.onnx', 0.5);
        progressCallback(PROCESSING_PROGRESS_KEY, 0.25);
        return Promise.resolve(new Blob());
      }
    );
    const {store, setDownloadTip, setProcessTip} = createTestStore(createImage());
    store.getState().setUpscaleModel(MODEL);

    await store.getState().upscaleImage();

    expect(setDownloadTip).toHaveBeenCalledExactlyOnceWith('downloading model.onnx');
    expect(setProcessTip).toHaveBeenCalledExactlyOnceWith('processing 0.25');
  });
});
