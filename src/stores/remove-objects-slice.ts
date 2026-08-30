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
import {hasAccessTo} from '@/services/auth/utils';
import {commandVertices, EditImageCommandType} from '@/services/image/edit-image-command';
import {createObjectsMask, inpaint, objectsBoundingBox} from '@/services/image/inpainting';
import type {Vector} from '@/services/math/geometry';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import {DrawImage, imageBitmapToBlob} from '@/utils/graphics';
import {createAbortError} from '@/utils/promise';

export interface RemoveObjectsSlice {
  removeObjectsModel?: OnnxModel;
  // [] clears the polygon, undefined leaves it alone.
  removeObjectsVertices?: Vector[];

  setRemoveObjectsModel: (removeObjectsModel: OnnxModel | undefined) => void;
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

    removeObjects: async (vertices: Vector[]): Promise<boolean> => {
      const {removeObjectsModel, auth} = get();
      if (
        vertices.length < 3 ||
        !removeObjectsModel ||
        !hasAccessTo(auth?.user, removeObjectsModel)
      ) {
        return false;
      }
      return await get().editImageOperation.execute(async ({image, setDownloadTip, signal}) => {
        // A superseding edit can close the store's image while inference still reads it.
        const inputImage = await createImageBitmap(image);
        try {
          signal.throwIfAborted();
          const boundingBox = objectsBoundingBox(vertices, inputImage);
          const inpaintedImage = await inpaint(
            inputImage,
            createObjectsMask(vertices, inputImage),
            removeObjectsModel,
            auth,
            (key, progress) => {
              setDownloadTip(formatFetchProgress(key, progress));
            },
            signal
          );
          try {
            signal.throwIfAborted();
            const result = await imageBitmapToBlob(inpaintedImage, {
              drawImage: DrawImage.cropRectangle(boundingBox),
            });
            signal.throwIfAborted();
            if (get().removeObjectsModel !== removeObjectsModel) {
              throw createAbortError();
            }
            const {topLeft, width, height} = boundingBox;
            return {
              type: EditImageCommandType.RemoveObjects,
              vertices: vertices.map(({x, y}) => ({x, y})),
              boundingBox: {x: topLeft.x, y: topLeft.y, width, height},
              result,
            };
          } finally {
            inpaintedImage.close();
          }
        } finally {
          inputImage.close();
        }
      });
    },
  };
};
