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
import {
  createRemoveBackgroundSlice,
  type RemoveBackgroundSlice,
} from '@/stores/remove-background-slice';

const imageOperations = vi.hoisted(() => ({
  createBackgroundMask: vi.fn(),
  imageToBlob: vi.fn(),
}));

vi.mock('@/i18n', () => ({
  formatFetchProgress: vi.fn(),
}));

vi.mock('@/services/image/remove-background', () => ({
  createBackgroundMask: imageOperations.createBackgroundMask,
}));

vi.mock('@/utils/graphics', () => ({
  imageToBlob: imageOperations.imageToBlob,
}));

function createImage(width = 100, height = 100): ImageBitmap {
  return {width, height, close: vi.fn()};
}

function createMask(width = 100, height = 100): OffscreenCanvas {
  return {width, height} as OffscreenCanvas;
}

type TestStore = RemoveBackgroundSlice &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'editImageHistory'>;

function createTestStore(image: ImageBitmap) {
  let previewCommand: EditImageCommand | null = null;
  let updateEditImagePreview = (_command: EditImageCommand): void => undefined;
  const preview = vi.fn(
    async (commandOrSupplier: EditImageCommand | EditImageCommandSupplier): Promise<boolean> => {
      const command =
        typeof commandOrSupplier === 'function'
          ? await commandOrSupplier({
              image,
              signal: new AbortController().signal,
              setDownloadTip: vi.fn(),
            } satisfies EditImageContext<ImageBitmap>)
          : commandOrSupplier;
      if (!command) {
        return false;
      }
      previewCommand = command;
      updateEditImagePreview(command);
      return true;
    }
  );
  const editImageOperation: EditImageOperation = {
    run: vi.fn(),
    preview,
    execute: vi.fn(),
    abort: vi.fn(),
  };
  const store = createStore<TestStore>()((...args) => ({
    auth: null,
    editImageOperation,
    editImageHistory: [{command: {type: EditImageCommandType.RotateClockwise}, replaceable: true}],
    ...createRemoveBackgroundSlice(...args),
  }));
  updateEditImagePreview = command => {
    if (command.type === EditImageCommandType.AdjustColors) {
      throw new Error('Unexpected Adjust Colors command');
    }
    store.setState({editImageHistory: [{command, replaceable: true}]});
  };
  return {store, preview, getPreviewCommand: () => previewCommand};
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('RemoveBackgroundSlice', () => {
  it('stores one PNG mask and reuses it when the background color changes', async () => {
    const image = createImage();
    const inputImage = createImage();
    const maskImage = createMask(20, 20);
    const maskBlob = new Blob();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValueOnce(inputImage));
    imageOperations.createBackgroundMask.mockResolvedValueOnce(maskImage);
    imageOperations.imageToBlob.mockResolvedValueOnce(maskBlob);
    const {store, preview, getPreviewCommand} = createTestStore(image);
    const model: OnnxModel = {
      id: 'background-removal',
      url: 'model.onnx',
      freeTier: true,
    };
    store.getState().setRemoveBackgroundModel(model);

    await store.getState().removeBackground();

    expect(getPreviewCommand()).toEqual({
      type: EditImageCommandType.RemoveBackground,
      mask: maskBlob,
      backgroundColor: null,
    });
    expect(inputImage.close).toHaveBeenCalledOnce();

    store.getState().setRemoveBackgroundColor('#ffffff');

    await vi.waitFor(() => {
      expect(getPreviewCommand()).toEqual({
        type: EditImageCommandType.RemoveBackground,
        mask: maskBlob,
        backgroundColor: '#ffffff',
      });
    });
    expect(imageOperations.createBackgroundMask).toHaveBeenCalledOnce();
    expect(imageOperations.imageToBlob).toHaveBeenCalledOnce();

    store.getState().resetRemoveBackground();

    expect(store.getState().removeBackgroundColor).toBeNull();
    store.getState().setRemoveBackgroundColor('#000000');
    await vi.waitFor(() => {
      expect(getPreviewCommand()).toEqual({
        type: EditImageCommandType.RemoveBackground,
        mask: maskBlob,
        backgroundColor: '#000000',
      });
    });
    expect(preview).toHaveBeenCalledTimes(3);
  });

  it('does not change the background color once another edit is on top', async () => {
    const {store, preview} = createTestStore(createImage());
    store.setState({
      editImageHistory: [
        {command: {type: EditImageCommandType.RotateClockwise}, replaceable: false},
      ],
    });

    store.getState().setRemoveBackgroundColor('#ffffff');

    expect(preview).not.toHaveBeenCalled();
  });

  it('does not remove the background without access to the model', async () => {
    const {store, preview} = createTestStore(createImage());
    store.getState().setRemoveBackgroundModel({id: 'rmbg', freeTier: false} as OnnxModel);

    await store.getState().removeBackground();

    expect(preview).not.toHaveBeenCalled();
    expect(imageOperations.createBackgroundMask).not.toHaveBeenCalled();
  });

  it('discards a mask produced by a model that is no longer selected', async () => {
    const image = createImage();
    const {store, getPreviewCommand} = createTestStore(image);
    const model = {id: 'rmbg', freeTier: true} as OnnxModel;
    store.getState().setRemoveBackgroundModel(model);
    const maskImage = createMask();
    imageOperations.createBackgroundMask.mockImplementationOnce(() => {
      store.getState().setRemoveBackgroundModel({id: 'other', freeTier: true} as OnnxModel);
      return Promise.resolve(maskImage);
    });
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(createImage()));

    await expect(store.getState().removeBackground()).rejects.toThrow();
    expect(getPreviewCommand()).toBeNull();
  });
});
