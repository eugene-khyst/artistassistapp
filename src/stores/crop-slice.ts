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

import type {CropAspectRatio} from '@/services/canvas/mode/image-cropping-mode';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import type {Rectangle} from '@/services/math/geometry';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import {ImageEditorKey} from '@/tabs';

export interface CropSlice {
  cropAspectRatio: CropAspectRatio;

  setCropAspectRatio: (aspectRatio: CropAspectRatio) => void;
  resetCrop: () => void;
  cropImage: (rectangle: Rectangle) => void;
}

type CropSliceDependencies = Pick<EditImageSlice, 'editImageOperation'>;

export const createCropSlice: StateCreator<CropSlice & CropSliceDependencies, [], [], CropSlice> = (
  set,
  get
) => {
  const resetCrop = (): void => {
    set({cropAspectRatio: null});
  };

  // The crop rectangle survives an editor switch, so the aspect ratio that shapes it must too.
  imageEditorControls.register(ImageEditorKey.Crop, {clear: resetCrop});

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
