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

import {ORIGINAL_CROP_ASPECT_RATIO} from '@/services/image/aspect-ratio';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {Rectangle, Vector} from '@/services/math/geometry';
import type {OnnxModel} from '@/services/ml/types';
import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import {createCropSlice, type CropSlice} from '@/stores/crop-slice';
import type {EditImageContext, EditImageOperation, EditImageSlice} from '@/stores/edit-image-slice';
import {createStraightenSlice, type StraightenSlice} from '@/stores/straighten-slice';

vi.mock('@/i18n', () => ({
  formatFetchProgress: vi.fn(),
}));
const imageOperations = vi.hoisted(() => ({detectDocumentCorners: vi.fn()}));

vi.mock('@/services/image/straighten', () => ({
  detectDocumentCorners: imageOperations.detectDocumentCorners,
}));

function createImage(): ImageBitmap {
  return {close: vi.fn()} as unknown as ImageBitmap;
}

function onnxModel(freeTier: boolean): OnnxModel {
  return {id: 'docaligner', freeTier} as OnnxModel;
}

type TestStore = CropSlice &
  StraightenSlice &
  Pick<AppSlice, 'saveAppSettings'> &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

function createTestStore(image: ImageBitmap | null = null) {
  const saveAppSettings = vi.fn(async () => DEFAULT_APP_SETTINGS);
  const execute = vi.fn().mockResolvedValue(true);
  const withEditedImage = vi.fn(async (task: (context: EditImageContext) => unknown) =>
    task({
      image,
      signal: new AbortController().signal,
      setDownloadTip: vi.fn(),
      setProcessTip: vi.fn(),
    })
  );
  const editImageOperation: EditImageOperation = {
    withEditedImage: withEditedImage as EditImageOperation['withEditedImage'],
    preview: vi.fn(),
    execute,
    abort: vi.fn(),
  };
  const store = createStore<TestStore>()((...args) => ({
    auth: null,
    saveAppSettings,
    editImageOperation,
    undoneEditImageHistory: [],
    ...createCropSlice(...args),
    ...createStraightenSlice(...args),
  }));
  return {store, execute, withEditedImage, saveAppSettings};
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('discrete image-editing slices', () => {
  it('persists and resets to the preferred Crop aspect ratio', () => {
    const {store, saveAppSettings} = createTestStore();
    store.getState().setCropAspectRatio([4, 5]);

    store.getState().resetCrop();

    expect(store.getState()).toMatchObject({cropAspectRatio: [4, 5]});
    expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({cropAspectRatio: '4:5'});
  });

  it('loads the preferred Crop aspect ratio from settings', () => {
    const {store, saveAppSettings} = createTestStore();

    store.getState().loadCropSettings({
      ...DEFAULT_APP_SETTINGS,
      cropAspectRatio: ORIGINAL_CROP_ASPECT_RATIO,
    });

    expect(store.getState().cropAspectRatio).toBe(ORIGINAL_CROP_ASPECT_RATIO);
    expect(saveAppSettings).not.toHaveBeenCalled();
  });

  it('executes Crop as a cumulative command', () => {
    const {store, execute} = createTestStore();

    store.getState().cropImage(Rectangle.fromTopLeft(new Vector(10, 20), 30, 40));

    expect(execute).toHaveBeenCalledWith({
      type: EditImageCommandType.Crop,
      rectangle: {x: 10, y: 20, width: 30, height: 40},
    });
  });

  it('executes Straighten as a cumulative command', () => {
    const {store, execute} = createTestStore();
    const vertices = [new Vector(1, 2), new Vector(3, 4), new Vector(5, 6), new Vector(7, 8)];

    store.getState().straightenImage(vertices);

    expect(execute).toHaveBeenCalledWith({
      type: EditImageCommandType.Straighten,
      vertices: [
        {x: 1, y: 2},
        {x: 3, y: 4},
        {x: 5, y: 6},
        {x: 7, y: 8},
      ],
    });
  });

  it('does not auto-detect without a model', async () => {
    const {store, withEditedImage} = createTestStore(createImage());

    await expect(store.getState().autoDetectStraightenVertices()).resolves.toBeNull();
    expect(withEditedImage).not.toHaveBeenCalled();
  });

  it('does not auto-detect without access to the model', async () => {
    const {store, withEditedImage} = createTestStore(createImage());
    store.getState().setStraightenModel(onnxModel(false));

    await expect(store.getState().autoDetectStraightenVertices()).resolves.toBeNull();
    expect(withEditedImage).not.toHaveBeenCalled();
    expect(imageOperations.detectDocumentCorners).not.toHaveBeenCalled();
  });

  it('auto-detects with a free-tier model', async () => {
    const image = createImage();
    const {store} = createTestStore(image);
    const vertices = [new Vector(0, 0), new Vector(1, 0), new Vector(1, 1), new Vector(0, 1)];
    imageOperations.detectDocumentCorners.mockResolvedValueOnce(vertices);
    const model = onnxModel(true);
    store.getState().setStraightenModel(model);

    await expect(store.getState().autoDetectStraightenVertices()).resolves.toBe(vertices);
    expect(imageOperations.detectDocumentCorners).toHaveBeenCalledWith(
      image,
      model,
      null,
      expect.any(Function),
      expect.any(AbortSignal)
    );
  });

  it('discards vertices detected by a model that is no longer selected', async () => {
    const {store} = createTestStore(createImage());
    store.getState().setStraightenModel(onnxModel(true));
    imageOperations.detectDocumentCorners.mockImplementationOnce(() => {
      store.getState().setStraightenModel(onnxModel(true));
      return Promise.resolve([new Vector(0, 0)]);
    });

    await expect(store.getState().autoDetectStraightenVertices()).resolves.toBeUndefined();
  });
});
