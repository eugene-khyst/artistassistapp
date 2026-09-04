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

import type {StateCreator} from 'zustand';

import {formatFetchProgress} from '@/i18n';
import {ImageEditorKey} from '@/image-editor';
import type {Authentication} from '@/services/auth/types';
import {hasAccessTo} from '@/services/auth/utils';
import {commandVertices, EditImageCommandType} from '@/services/image/edit-image-command';
import {inpaintImage} from '@/services/image/inpaint';
import {inpaintingWindowSquare, polygonPatchRectangle} from '@/services/image/inpainting-patch';
import {Rectangle, Vector} from '@/services/math/geometry';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import type {FetchProgressCallback} from '@/utils/fetch';
import {
  createPolygonMask,
  DrawImage,
  drawImageToOffscreenCanvas,
  imageToBlob,
} from '@/utils/graphics';
import {createAbortError} from '@/utils/promise';

const INPAINTING_WINDOW_PATCH_SCALE = 2;

interface RemoveObjectsWindow {
  patchRectangle: Rectangle;
  windowRectangle: Rectangle;
  windowImage: OffscreenCanvas;
  windowMask: OffscreenCanvas;
}

async function prepareRemoveObjectsWindow({
  image,
  vertices,
  model,
  signal,
}: {
  image: ImageBitmap;
  vertices: readonly Vector[];
  model: OnnxModel;
  signal: AbortSignal;
}): Promise<RemoveObjectsWindow> {
  const inputImage = await createImageBitmap(image);
  try {
    signal.throwIfAborted();
    const patchRectangle = polygonPatchRectangle(vertices, inputImage);
    const bounds = new Rectangle(new Vector(inputImage.width, inputImage.height));
    const {resolution} = model;
    const modelResolution = Array.isArray(resolution) ? Math.max(...resolution) : (resolution ?? 0);
    const windowSide = Math.max(
      INPAINTING_WINDOW_PATCH_SCALE * Math.max(patchRectangle.width, patchRectangle.height),
      modelResolution
    );
    const windowRectangle = inpaintingWindowSquare(patchRectangle, bounds, windowSide) ?? bounds;
    const mask = createPolygonMask(vertices, inputImage);
    const [windowImage] = drawImageToOffscreenCanvas(inputImage, {
      drawImage: DrawImage.cropRectangle(windowRectangle),
    });
    const [windowMask] = drawImageToOffscreenCanvas(mask, {
      drawImage: DrawImage.cropRectangle(windowRectangle),
    });
    return {patchRectangle, windowRectangle, windowImage, windowMask};
  } finally {
    inputImage.close();
  }
}

async function createRemoveObjectsPatch({
  image,
  vertices,
  inpaintModel,
  upscaleModel,
  auth,
  progressCallback,
  signal,
}: {
  image: ImageBitmap;
  vertices: readonly Vector[];
  inpaintModel: OnnxModel;
  upscaleModel: OnnxModel;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<{patchRectangle: Rectangle; result: Blob}> {
  const {patchRectangle, windowRectangle, windowImage, windowMask} =
    await prepareRemoveObjectsWindow({
      image,
      vertices,
      model: inpaintModel,
      signal,
    });
  const inpaintedImage = await inpaintImage({
    images: [windowImage, windowMask],
    target: windowRectangle,
    inpaintModel,
    upscaleModel,
    auth,
    progressCallback,
    signal,
  });
  const windowPatchRectangle = Rectangle.fromTopLeft(
    patchRectangle.topLeft.subtract(windowRectangle.topLeft),
    patchRectangle.width,
    patchRectangle.height
  );
  const result = await imageToBlob(inpaintedImage, {
    drawImage: DrawImage.cropRectangle(windowPatchRectangle),
  });
  signal.throwIfAborted();
  return {patchRectangle, result};
}

export interface RemoveObjectsSlice {
  removeObjectsModel?: OnnxModel;
  removeObjectsUpscaleModel?: OnnxModel;
  // [] clears the polygon, undefined leaves it alone.
  removeObjectsVertices?: Vector[];

  setRemoveObjectsModel: (removeObjectsModel: OnnxModel | undefined) => void;
  setRemoveObjectsUpscaleModel: (removeObjectsUpscaleModel: OnnxModel | undefined) => void;
  removeObjects: (vertices: Vector[]) => Promise<boolean>;
}

type RemoveObjectsSliceDependencies = Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

export const createRemoveObjectsSlice: StateCreator<
  RemoveObjectsSlice & RemoveObjectsSliceDependencies,
  [],
  [],
  RemoveObjectsSlice
> = (set, get) => {
  // Applying clears the polygon, so only an undone edit can bring it back.
  const undoneRemoveObjectsVertices = (): Vector[] | undefined =>
    commandVertices(
      get().undoneEditImageHistory.at(-1)?.command,
      EditImageCommandType.RemoveObjects
    );

  imageEditorControls.register(ImageEditorKey.RemoveObjects, {
    reset: () => {
      set({
        removeObjectsVertices: undoneRemoveObjectsVertices(),
      });
    },
    restore: () => {
      set({
        removeObjectsVertices: undoneRemoveObjectsVertices() ?? [],
      });
    },
  });

  return {
    setRemoveObjectsModel: (removeObjectsModel: OnnxModel | undefined): void => {
      if (get().removeObjectsModel === removeObjectsModel) {
        return;
      }
      set({
        removeObjectsModel,
      });
    },

    setRemoveObjectsUpscaleModel: (removeObjectsUpscaleModel: OnnxModel | undefined): void => {
      if (get().removeObjectsUpscaleModel === removeObjectsUpscaleModel) {
        return;
      }
      set({
        removeObjectsUpscaleModel,
      });
    },

    removeObjects: async (vertices: Vector[]): Promise<boolean> => {
      const {removeObjectsModel, removeObjectsUpscaleModel, auth} = get();
      if (
        vertices.length < 3 ||
        !removeObjectsModel ||
        !removeObjectsUpscaleModel ||
        !hasAccessTo(auth?.user, [removeObjectsModel, removeObjectsUpscaleModel])
      ) {
        return false;
      }
      return await get().editImageOperation.execute(async ({image, setDownloadTip, signal}) => {
        const {patchRectangle, result} = await createRemoveObjectsPatch({
          image,
          vertices,
          inpaintModel: removeObjectsModel,
          upscaleModel: removeObjectsUpscaleModel,
          auth,
          progressCallback: (key, progress) => {
            setDownloadTip(formatFetchProgress(key, progress));
          },
          signal,
        });
        if (
          get().removeObjectsModel !== removeObjectsModel ||
          get().removeObjectsUpscaleModel !== removeObjectsUpscaleModel
        ) {
          throw createAbortError();
        }
        const {topLeft, width, height} = patchRectangle;
        return {
          type: EditImageCommandType.RemoveObjects,
          vertices: vertices.map(({x, y}) => ({x, y})),
          patchRectangle: {x: topLeft.x, y: topLeft.y, width, height},
          result,
        };
      });
    },
  };
};
