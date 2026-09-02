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
import {
  type CropAspectRatio,
  imageAspectRatio,
  imageAspectRatioLabel,
  ORIGINAL_CROP_ASPECT_RATIO,
} from '@/services/image/aspect-ratio';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {Rectangle, Vector} from '@/services/math/geometry';
import type {AppSettings} from '@/services/settings/types';
import type {AppSlice} from '@/stores/app-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';

const FREE_CROP_ASPECT_RATIO = 'free';

function cropAspectRatioFromSettings(value: string | undefined): CropAspectRatio {
  if (value === ORIGINAL_CROP_ASPECT_RATIO) {
    return ORIGINAL_CROP_ASPECT_RATIO;
  }
  return imageAspectRatio(value ?? '') ?? null;
}

function cropAspectRatioSetting(aspectRatio: CropAspectRatio): string {
  if (!aspectRatio) {
    return FREE_CROP_ASPECT_RATIO;
  }
  return typeof aspectRatio === 'string' ? aspectRatio : imageAspectRatioLabel(aspectRatio);
}

export interface CropSlice {
  cropAspectRatio: CropAspectRatio;
  // null clears the crop rectangle, undefined leaves it alone.
  cropRectangle?: Rectangle | null;

  loadCropSettings: (appSettings: AppSettings) => void;
  setCropAspectRatio: (aspectRatio: CropAspectRatio) => void;
  resetCrop: () => void;
  cropImage: (rectangle: Rectangle) => void;
}

type CropSliceDependencies = Pick<AppSlice, 'saveAppSettings'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

export const createCropSlice: StateCreator<CropSlice & CropSliceDependencies, [], [], CropSlice> = (
  set,
  get
) => {
  let preferredCropAspectRatio: CropAspectRatio = null;

  const resetCrop = (): void => {
    set({
      cropAspectRatio: preferredCropAspectRatio,
    });
  };

  const loadCropSettings = (appSettings: AppSettings): void => {
    preferredCropAspectRatio = cropAspectRatioFromSettings(appSettings.cropAspectRatio);
    set({
      cropAspectRatio: preferredCropAspectRatio,
    });
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
    clear: resetCrop,
  });

  return {
    cropAspectRatio: null,

    loadCropSettings,

    setCropAspectRatio: (cropAspectRatio: CropAspectRatio): void => {
      const setting = cropAspectRatioSetting(cropAspectRatio);
      if (cropAspectRatioSetting(preferredCropAspectRatio) === setting) {
        return;
      }
      preferredCropAspectRatio = cropAspectRatio;
      set({
        cropAspectRatio,
      });
      void get().saveAppSettings({cropAspectRatio: setting});
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
