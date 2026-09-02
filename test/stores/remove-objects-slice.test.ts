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
import {Interpolation} from '@/services/image/filter/types';
import {Vector} from '@/services/math/geometry';
import type {AuthSlice} from '@/stores/auth-slice';
import type {
  EditImageCommandSupplier,
  EditImageOperation,
  EditImageSlice,
} from '@/stores/edit-image-slice';
import {createRemoveObjectsSlice, type RemoveObjectsSlice} from '@/stores/remove-objects-slice';
import type {DrawImageParams, DrawImageParamsSupplier, DrawImageSource} from '@/utils/graphics';

const transformerMocks = vi.hoisted(() => ({transformImage: vi.fn()}));
const interpolationMocks = vi.hoisted(() => ({interpolationWebGL: vi.fn()}));
const graphicsMocks = vi.hoisted(() => ({
  copyOffscreenCanvas: vi.fn((image: DrawImageSource) => image),
  createPolygonMask: vi.fn(),
  drawImageToOffscreenCanvas: vi.fn(),
  imageToBlob: vi.fn(),
}));

vi.mock('@/i18n', () => ({formatFetchProgress: vi.fn()}));
vi.mock('@/services/ml/image-transformer', () => transformerMocks);
vi.mock('@/services/image/filter/interpolation-webgl', () => interpolationMocks);
vi.mock('@/utils/graphics', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...graphicsMocks,
}));

type TestStore = RemoveObjectsSlice &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

function createTestStore() {
  let suppliedCommand: EditImageCommand | null | undefined;
  const image = {width: 1000, height: 800} as ImageBitmap;
  const execute = vi.fn(async (commandOrSupplier: EditImageCommand | EditImageCommandSupplier) => {
    suppliedCommand =
      typeof commandOrSupplier === 'function'
        ? await commandOrSupplier({
            image,
            signal: new AbortController().signal,
            setDownloadTip: vi.fn(),
          })
        : commandOrSupplier;
    return !!suppliedCommand;
  });
  const editImageOperation: EditImageOperation = {
    run: vi.fn() as EditImageOperation['run'],
    preview: vi.fn(),
    execute,
    abort: vi.fn(),
  };
  const store = createStore<TestStore>()((...args) => ({
    auth: null,
    editImageOperation,
    undoneEditImageHistory: [],
    ...createRemoveObjectsSlice(...args),
  }));
  return {store, suppliedCommand: () => suppliedCommand};
}

function drawImageParams({width, height}: DrawImageSource): DrawImageParams {
  return {width, height, sx: 0, sy: 0, sw: width, sh: height, dx: 0, dy: 0, dw: width, dh: height};
}

const upscaleModel = {id: 'real-esrgan', freeTier: true, url: 'upscale.onnx'};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('remove-objects-slice', () => {
  it('inpaints a square context window and caches only the padded mask patch', async () => {
    const {store, suppliedCommand} = createTestStore();
    const inputImage = {width: 1000, height: 800, close: vi.fn()} as unknown as ImageBitmap;
    const mask = {width: 1000, height: 800} as OffscreenCanvas;
    const inpaintedImage = {width: 512, height: 512} as OffscreenCanvas;
    const fittedImage = {width: 512, height: 512} as OffscreenCanvas;
    const result = new Blob(['result']);
    const windowCrops: DrawImageParams[] = [];
    let inpaintingInput: {image: DrawImageSource; mask: DrawImageSource} | undefined;
    let resultCrop: DrawImageParams | undefined;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(inputImage));
    graphicsMocks.createPolygonMask.mockReturnValue(mask);
    graphicsMocks.drawImageToOffscreenCanvas.mockImplementation(
      (source: DrawImageSource, {drawImage}: {drawImage: DrawImageParamsSupplier}) => {
        const params = drawImage(drawImageParams(source));
        windowCrops.push(params);
        return [{width: params.width, height: params.height} as OffscreenCanvas];
      }
    );
    transformerMocks.transformImage.mockImplementation(
      async ({images}: {images: DrawImageSource[]}) => {
        expect(inputImage.close).toHaveBeenCalledOnce();
        inpaintingInput = {image: images[0]!, mask: images[1]!};
        return inpaintedImage;
      }
    );
    interpolationMocks.interpolationWebGL.mockReturnValue(fittedImage);
    graphicsMocks.imageToBlob.mockImplementation(
      async (source: ImageBitmap, {drawImage}: {drawImage: DrawImageParamsSupplier}) => {
        resultCrop = drawImage(drawImageParams(source));
        return result;
      }
    );
    store.getState().setRemoveObjectsModel({
      id: 'inpainting_lama_2025jan',
      freeTier: true,
      url: 'model.onnx',
      resolution: 512,
    });
    store.getState().setRemoveObjectsUpscaleModel(upscaleModel);
    const vertices = [new Vector(400, 300), new Vector(500, 300), new Vector(500, 400)];

    await expect(store.getState().removeObjects(vertices)).resolves.toBe(true);

    expect(windowCrops).toEqual([
      expect.objectContaining({width: 512, height: 512, sx: 194, sy: 94, sw: 512, sh: 512}),
      expect.objectContaining({width: 512, height: 512, sx: 194, sy: 94, sw: 512, sh: 512}),
    ]);
    expect(resultCrop).toEqual(
      expect.objectContaining({width: 164, height: 164, sx: 174, sy: 174, sw: 164, sh: 164})
    );
    expect(inpaintingInput).toMatchObject({
      image: {width: 512, height: 512},
      mask: {width: 512, height: 512},
    });
    expect(graphicsMocks.imageToBlob.mock.calls[0]![0]).toBe(fittedImage);
    expect(suppliedCommand()).toEqual({
      type: EditImageCommandType.RemoveObjects,
      vertices: vertices.map(({x, y}) => ({x, y})),
      patchRectangle: {x: 368, y: 268, width: 164, height: 164},
      result,
    });
    expect(inputImage.close).toHaveBeenCalledOnce();
    expect(transformerMocks.transformImage).toHaveBeenCalledOnce();
    expect(interpolationMocks.interpolationWebGL).toHaveBeenCalledExactlyOnceWith(
      inpaintedImage,
      512,
      512,
      Interpolation.Lanczos
    );
  });

  it('does not upscale a context window below the minimum scale factor', async () => {
    const {store} = createTestStore();
    const inputImage = {width: 1000, height: 800, close: vi.fn()} as unknown as ImageBitmap;
    const inpaintedImage = {width: 512, height: 512} as OffscreenCanvas;
    const fittedImage = {width: 600, height: 600} as OffscreenCanvas;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(inputImage));
    graphicsMocks.createPolygonMask.mockReturnValue({width: 1000, height: 800});
    graphicsMocks.drawImageToOffscreenCanvas.mockImplementation(
      (source: DrawImageSource, {drawImage}: {drawImage: DrawImageParamsSupplier}) => {
        const params = drawImage(drawImageParams(source));
        return [{width: params.width, height: params.height} as OffscreenCanvas];
      }
    );
    transformerMocks.transformImage.mockResolvedValue(inpaintedImage);
    interpolationMocks.interpolationWebGL.mockReturnValue(fittedImage);
    graphicsMocks.imageToBlob.mockResolvedValue(new Blob(['result']));
    const model = {
      id: 'inpainting_lama_2025jan',
      freeTier: true,
      url: 'model.onnx',
      resolution: 512,
    };
    store.getState().setRemoveObjectsModel(model);
    store.getState().setRemoveObjectsUpscaleModel(upscaleModel);

    await expect(
      store
        .getState()
        .removeObjects([new Vector(400, 300), new Vector(636, 300), new Vector(636, 400)])
    ).resolves.toBe(true);

    expect(transformerMocks.transformImage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({model, interpolation: null})
    );
    expect(interpolationMocks.interpolationWebGL).toHaveBeenCalledExactlyOnceWith(
      inpaintedImage,
      600,
      600,
      Interpolation.Lanczos
    );
  });

  it('upscales the inpainted window before fitting it back above the minimum scale factor', async () => {
    const {store, suppliedCommand} = createTestStore();
    const inputImage = {width: 1000, height: 800, close: vi.fn()} as unknown as ImageBitmap;
    const inpaintedImage = {width: 512, height: 512} as OffscreenCanvas;
    const upscaledImage = {width: 2048, height: 2048} as OffscreenCanvas;
    const fittedImage = {width: 1000, height: 800} as OffscreenCanvas;
    const result = new Blob(['result']);
    let resultCrop: DrawImageParams | undefined;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(inputImage));
    graphicsMocks.createPolygonMask.mockReturnValue({width: 1000, height: 800});
    graphicsMocks.drawImageToOffscreenCanvas.mockImplementation(
      (source: DrawImageSource, {drawImage}: {drawImage: DrawImageParamsSupplier}) => {
        const params = drawImage(drawImageParams(source));
        return [{width: params.width, height: params.height} as OffscreenCanvas];
      }
    );
    transformerMocks.transformImage.mockImplementation(
      async ({images}: {images: DrawImageSource[]}) =>
        images.length === 2 ? inpaintedImage : upscaledImage
    );
    interpolationMocks.interpolationWebGL.mockReturnValue(fittedImage);
    graphicsMocks.imageToBlob.mockImplementation(
      async (source: ImageBitmap, {drawImage}: {drawImage: DrawImageParamsSupplier}) => {
        resultCrop = drawImage(drawImageParams(source));
        return result;
      }
    );
    const model = {
      id: 'inpainting_lama_2025jan',
      freeTier: true,
      url: 'model.onnx',
      resolution: 512,
    };
    store.getState().setRemoveObjectsModel(model);
    store.getState().setRemoveObjectsUpscaleModel(upscaleModel);
    const vertices = [new Vector(100, 100), new Vector(900, 100), new Vector(900, 700)];

    await expect(store.getState().removeObjects(vertices)).resolves.toBe(true);

    // the window falls back to the whole image, so the raw model output is upscaled first
    expect(transformerMocks.transformImage.mock.calls[0]![0]).toMatchObject({
      model,
      interpolation: null,
    });
    expect(transformerMocks.transformImage.mock.calls[1]![0]).toMatchObject({
      images: [inpaintedImage],
      model: upscaleModel,
      interpolation: null,
    });
    expect(interpolationMocks.interpolationWebGL).toHaveBeenCalledExactlyOnceWith(
      upscaledImage,
      1000,
      800,
      Interpolation.Lanczos
    );
    expect(resultCrop).toEqual(expect.objectContaining({width: 864, height: 664, sx: 68, sy: 68}));
    expect(graphicsMocks.imageToBlob.mock.calls[0]![0]).toBe(fittedImage);
    expect(suppliedCommand()).toMatchObject({
      patchRectangle: {x: 68, y: 68, width: 864, height: 664},
    });
  });

  it('does not remove objects without an upscale model', async () => {
    const {store} = createTestStore();
    store.getState().setRemoveObjectsModel({
      id: 'inpainting_lama_2025jan',
      freeTier: true,
      url: 'model.onnx',
      resolution: 512,
    });

    await expect(
      store.getState().removeObjects([new Vector(0, 0), new Vector(9, 0), new Vector(9, 9)])
    ).resolves.toBe(false);
    expect(transformerMocks.transformImage).not.toHaveBeenCalled();
  });
});
