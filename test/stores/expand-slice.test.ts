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
import {ExpandFillMode, ExpandMode} from '@/services/image/expand-controls';
import {Interpolation} from '@/services/image/filter/types';
import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {
  EditImageCommandSupplier,
  EditImageOperation,
  EditImageSlice,
} from '@/stores/edit-image-slice';
import {createExpandSlice, type ExpandSlice} from '@/stores/expand-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import type {DrawImageParams, DrawImageParamsSupplier, DrawImageSource} from '@/utils/graphics';

const expansionMocks = vi.hoisted(() => ({
  createExpansionMask: vi.fn(),
  drawExpandedImage: vi.fn(),
}));
const graphicsMocks = vi.hoisted(() => ({
  copyOffscreenCanvas: vi.fn((image: DrawImageSource) => image),
  imageToBlob: vi.fn(),
}));
const transformerMocks = vi.hoisted(() => ({transformImage: vi.fn()}));
const interpolationMocks = vi.hoisted(() => ({interpolationWebGL: vi.fn()}));

vi.mock('@/i18n', () => ({formatFetchProgress: vi.fn()}));
vi.mock('@/services/image/expand-image', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...expansionMocks,
}));
vi.mock('@/services/ml/image-transformer', () => transformerMocks);
vi.mock('@/services/image/filter/interpolation-webgl', () => interpolationMocks);
vi.mock('@/utils/graphics', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...graphicsMocks,
}));

type TestStore = ExpandSlice &
  Pick<AppSlice, 'appSettings' | 'saveAppSettings'> &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

function createTestStore() {
  const saveAppSettings = vi.fn(async (settings: Partial<AppSlice['appSettings']>) => {
    const appSettings = {...store.getState().appSettings, ...settings};
    store.setState({appSettings});
    return appSettings;
  });
  let suppliedCommand: EditImageCommand | null | undefined;
  const image = {width: 200, height: 100} as ImageBitmap;
  const execute = vi.fn(async (commandOrSupplier: EditImageCommand | EditImageCommandSupplier) => {
    suppliedCommand =
      typeof commandOrSupplier === 'function'
        ? await commandOrSupplier({
            image,
            signal: new AbortController().signal,
            setDownloadTip: vi.fn(),
            setProcessTip: vi.fn(),
          })
        : commandOrSupplier;
    return !!suppliedCommand;
  });
  const editImageOperation: EditImageOperation = {
    withEditedImage: vi.fn() as EditImageOperation['withEditedImage'],
    preview: vi.fn(),
    execute,
    abort: vi.fn(),
  };
  const store = createStore<TestStore>()((...args) => ({
    auth: null,
    appSettings: DEFAULT_APP_SETTINGS,
    saveAppSettings,
    editImageOperation,
    undoneEditImageHistory: [],
    ...createExpandSlice(...args),
  }));
  return {store, suppliedCommand: () => suppliedCommand, saveAppSettings};
}

function mockOffscreenCanvas(): void {
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        readonly width: number,
        readonly height: number
      ) {}
      getContext() {
        return {
          drawImage: vi.fn(),
          setTransform: vi.fn(),
          fillRect: vi.fn(),
          createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
        };
      }
    }
  );
}

function drawImageParams({width, height}: DrawImageSource): DrawImageParams {
  return {width, height, sx: 0, sy: 0, sw: width, sh: height, dx: 0, dy: 0, dw: width, dh: height};
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('expand-slice', () => {
  it('does not store command-only controls', () => {
    const {store, saveAppSettings} = createTestStore();

    store.getState().setExpandControls({marginX: 25, marginY: 15, color: '#123456'});

    expect(store.getState().expandControls).toMatchObject({
      marginX: 25,
      marginY: 15,
      color: '#123456',
    });
    expect(saveAppSettings).not.toHaveBeenCalled();
  });

  it('loads and stores settings', () => {
    const {store, saveAppSettings} = createTestStore();
    const appSettings = {
      ...DEFAULT_APP_SETTINGS,
      expandAspectRatio: '16:9',
      expandSizeMode: ExpandMode.Margins,
      expandFillMode: ExpandFillMode.Smart,
    };
    store.setState({appSettings});
    store.getState().loadExpandSettings(appSettings);

    expect(store.getState().expandControls).toMatchObject({
      aspectRatio: [16, 9],
      sizeMode: ExpandMode.Margins,
      fillMode: ExpandFillMode.Smart,
    });
    expect(saveAppSettings).not.toHaveBeenCalled();

    store.getState().setExpandControls({
      ...store.getState().expandControls,
      aspectRatio: [1.91, 1],
      sizeMode: ExpandMode.AspectRatio,
      fillMode: ExpandFillMode.Color,
      marginX: 25,
      color: '#123456',
    });

    expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({
      expandAspectRatio: '1.91:1',
      expandSizeMode: ExpandMode.AspectRatio,
      expandFillMode: ExpandFillMode.Color,
    });

    imageEditorControls.resetAll();

    expect(store.getState().expandControls).toEqual({
      aspectRatio: [1.91, 1],
      sizeMode: ExpandMode.AspectRatio,
      marginX: 10,
      marginY: 10,
      fillMode: ExpandFillMode.Color,
      color: '#fff',
    });
  });

  it('executes color expansion from its controls', async () => {
    const {store, suppliedCommand} = createTestStore();
    const controls = {
      ...store.getState().expandControls,
      sizeMode: ExpandMode.Margins,
      marginX: 10,
      marginY: 20,
      fillMode: ExpandFillMode.Color,
      color: '#123456',
    };
    store.getState().setExpandControls(controls);

    await expect(store.getState().expandImage()).resolves.toBe(true);

    expect(suppliedCommand()).toEqual({
      type: EditImageCommandType.Expand,
      controls,
    });
    expect(store.getState().expandControls).toEqual({...controls, marginX: 0, marginY: 0});
  });

  it('does not execute a no-op expansion', async () => {
    const {store, suppliedCommand} = createTestStore();
    store.getState().setExpandControls({
      ...store.getState().expandControls,
      aspectRatio: [2, 1],
    });

    await expect(store.getState().expandImage()).resolves.toBe(false);
    expect(suppliedCommand()).toBeNull();
  });

  it('caches only the padded Smart expansion margin patches', async () => {
    const {store, suppliedCommand} = createTestStore();
    const inputImage = {close: vi.fn()} as unknown as ImageBitmap;
    const expandedCanvas = {width: 240, height: 140} as OffscreenCanvas;
    const mask = {width: 240, height: 140} as OffscreenCanvas;
    const inpaintedImage = {width: 512, height: 512} as OffscreenCanvas;
    const expandedImage = {width: 240, height: 140} as OffscreenCanvas;
    const marginPatches = [
      new Blob(['top']),
      new Blob(['bottom']),
      new Blob(['left']),
      new Blob(['right']),
    ];
    const remainingPatches = [...marginPatches];
    const patchCrops: DrawImageParams[] = [];
    const model = {id: 'inpainting_lama_2025jan', freeTier: true, url: 'model.onnx'};
    const upscaleModel = {id: 'real-esrgan-general-x4v3', freeTier: true, url: 'upscale.onnx'};
    mockOffscreenCanvas();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(inputImage));
    expansionMocks.drawExpandedImage.mockReturnValue([expandedCanvas]);
    expansionMocks.createExpansionMask.mockReturnValue(mask);
    transformerMocks.transformImage.mockImplementation(async () => {
      expect(inputImage.close).toHaveBeenCalledOnce();
      return inpaintedImage;
    });
    interpolationMocks.interpolationWebGL.mockReturnValue(expandedImage);
    graphicsMocks.imageToBlob.mockImplementation(
      async (source: ImageBitmap, {drawImage}: {drawImage: DrawImageParamsSupplier}) => {
        patchCrops.push(drawImage(drawImageParams(source)));
        return remainingPatches.shift();
      }
    );
    store.getState().setExpandModel(model);
    store.getState().setExpandUpscaleModel(upscaleModel);
    const controls = {
      ...store.getState().expandControls,
      sizeMode: ExpandMode.Margins,
      marginX: 10,
      marginY: 20,
      fillMode: ExpandFillMode.Smart,
    };
    store.getState().setExpandControls(controls);

    await expect(store.getState().expandImage()).resolves.toBe(true);

    expect(suppliedCommand()).toMatchObject({
      type: EditImageCommandType.Expand,
      controls,
      marginPatches,
    });
    // the raw model output is needed, so inpainting must not resize it back
    expect(transformerMocks.transformImage.mock.calls[0]![0]).toMatchObject({
      images: [expandedCanvas, mask],
      model,
      interpolation: null,
    });
    expect(transformerMocks.transformImage).toHaveBeenCalledOnce();
    expect(interpolationMocks.interpolationWebGL).toHaveBeenCalledExactlyOnceWith(
      inpaintedImage,
      240,
      140,
      Interpolation.Lanczos
    );
    expect(graphicsMocks.imageToBlob.mock.calls.map(([source]) => source)).toEqual([
      expandedImage,
      expandedImage,
      expandedImage,
      expandedImage,
    ]);
    expect(patchCrops).toEqual([
      expect.objectContaining({sx: 0, sy: 0, sw: 240, sh: 52}),
      expect.objectContaining({sx: 0, sy: 88, sw: 240, sh: 52}),
      expect.objectContaining({sx: 0, sy: 0, sw: 52, sh: 140}),
      expect.objectContaining({sx: 188, sy: 0, sw: 52, sh: 140}),
    ]);
    expect(inputImage.close).toHaveBeenCalledOnce();
  });

  it('closes the input image when the upscale fails', async () => {
    const {store} = createTestStore();
    const inputImage = {close: vi.fn()} as unknown as ImageBitmap;
    const inpaintedImage = {width: 128, height: 128} as OffscreenCanvas;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(inputImage));
    expansionMocks.drawExpandedImage.mockReturnValue([{width: 240, height: 140}]);
    expansionMocks.createExpansionMask.mockReturnValue({});
    transformerMocks.transformImage
      .mockResolvedValueOnce(inpaintedImage)
      .mockRejectedValueOnce(new Error('upscale failed'));
    store.getState().setExpandModel({id: 'lama', freeTier: true, url: 'model.onnx'});
    store.getState().setExpandUpscaleModel({id: 'esrgan', freeTier: true, url: 'up.onnx'});
    store.getState().setExpandControls({
      ...store.getState().expandControls,
      sizeMode: ExpandMode.Margins,
      marginX: 10,
      marginY: 20,
      fillMode: ExpandFillMode.Smart,
    });

    await expect(store.getState().expandImage()).rejects.toThrow('upscale failed');

    expect(inputImage.close).toHaveBeenCalledOnce();
  });

  it('does not apply margin patches generated by a superseded model', async () => {
    const {store} = createTestStore();
    mockOffscreenCanvas();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({close: vi.fn()}));
    expansionMocks.drawExpandedImage.mockReturnValue([{width: 240, height: 140}]);
    expansionMocks.createExpansionMask.mockReturnValue({});
    transformerMocks.transformImage.mockImplementation(async () => {
      store.getState().setExpandUpscaleModel({id: 'other', freeTier: true, url: 'o.onnx'});
      return {width: 240, height: 140};
    });
    interpolationMocks.interpolationWebGL.mockReturnValue({width: 240, height: 140});
    graphicsMocks.imageToBlob.mockResolvedValue(new Blob(['patch']));
    store.getState().setExpandModel({id: 'lama', freeTier: true, url: 'model.onnx'});
    store.getState().setExpandUpscaleModel({id: 'esrgan', freeTier: true, url: 'up.onnx'});
    store.getState().setExpandControls({
      ...store.getState().expandControls,
      sizeMode: ExpandMode.Margins,
      marginX: 10,
      marginY: 20,
      fillMode: ExpandFillMode.Smart,
    });

    await expect(store.getState().expandImage()).rejects.toThrow();
  });

  it('does not run the Smart pipeline without an upscale model', async () => {
    const {store} = createTestStore();
    store.getState().setExpandModel({id: 'lama', freeTier: true, url: 'model.onnx'});
    store.getState().setExpandControls({
      ...store.getState().expandControls,
      sizeMode: ExpandMode.Margins,
      marginX: 10,
      marginY: 20,
      fillMode: ExpandFillMode.Smart,
    });

    await expect(store.getState().expandImage()).resolves.toBe(false);
    expect(transformerMocks.transformImage).not.toHaveBeenCalled();
  });
});
