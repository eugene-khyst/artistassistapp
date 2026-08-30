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

import {ImageEditorKey} from '@/image-editor';
import type {CropAspectRatio} from '@/services/canvas/mode/image-cropping-mode';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {Rectangle, Vector} from '@/services/math/geometry';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';

export interface CropSlice {
  cropAspectRatio: CropAspectRatio;
  // null clears the crop rectangle, undefined leaves it alone.
  cropRectangle?: Rectangle | null;

  setCropAspectRatio: (aspectRatio: CropAspectRatio) => void;
  resetCrop: () => void;
  cropImage: (rectangle: Rectangle) => void;
}

type CropSliceDependencies = Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

export const createCropSlice: StateCreator<CropSlice & CropSliceDependencies, [], [], CropSlice> = (
  set,
  get
) => {
  const resetCrop = (): void => {
    set({cropAspectRatio: null});
  };

  // Applying clears the crop rectangle, so only an undone edit can bring it back.
  const undoneCropRectangle = (): Rectangle | undefined => {
    const undone = get().undoneEditImageHistory.at(-1)?.command;
    if (undone?.type !== EditImageCommandType.Crop) {
      return undefined;
    }
    const {x, y, width, height} = undone.rectangle;
    return Rectangle.fromTopLeft(new Vector(x, y), width, height);
  };

  imageEditorControls.register(ImageEditorKey.Crop, {
    reset: () => {
      set({
        cropRectangle: undoneCropRectangle(),
      });
    },
    restore: () => {
      set({
        cropRectangle: undoneCropRectangle() ?? null,
      });
    },
    // Switching editors keeps the crop rectangle, so it must keep the ratio too.
    clear: resetCrop,
  });

  return {
    cropAspectRatio: null,

    setCropAspectRatio: (cropAspectRatio: CropAspectRatio): void => {
      set({cropAspectRatio});
    },

    resetCrop,

    cropImage: (rectangle: Rectangle): void => {
      void get().editImageOperation.execute({
        type: EditImageCommandType.Crop,
        rectangle: {
          x: rectangle.topLeft.x,
          y: rectangle.topLeft.y,
          width: rectangle.width,
          height: rectangle.height,
        },
      });
    },
  };
};
