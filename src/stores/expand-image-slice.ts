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
import {imageAspectRatio, imageAspectRatioLabel} from '@/services/image/aspect-ratio';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {
  createExpansionMask,
  drawExpandedImage,
  getImageExpansion,
  type ImageExpansion,
} from '@/services/image/expand-image';
import {
  DEFAULT_EXPAND_IMAGE_CONTROLS,
  type ExpandImageControls,
  ExpandImageFillMode,
  ExpandImageSizeMode,
} from '@/services/image/expand-image-controls';
import {fitInpaintedImage} from '@/services/image/inpainting-fit';
import {inpaintingPatchRectangle} from '@/services/image/inpainting-patch';
import {transformImage} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {AppSettings} from '@/services/settings/types';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import type {FetchProgressCallback} from '@/utils/fetch';
import {DrawImage, imageToBlob} from '@/utils/graphics';
import {createAbortError} from '@/utils/promise';

export interface ExpandImageSlice {
  expandImageControls: ExpandImageControls;
  expandImageModel?: OnnxModel;
  expandImageUpscaleModel?: OnnxModel;

  loadExpandImageSettings: (appSettings: AppSettings) => void;
  setExpandImageControls: (expandImageControls: ExpandImageControls) => void;
  setExpandImageModel: (expandImageModel: OnnxModel | undefined) => void;
  setExpandImageUpscaleModel: (expandImageUpscaleModel: OnnxModel | undefined) => void;
  expandImage: () => Promise<boolean>;
}

type ExpandImagePreferences = Pick<ExpandImageControls, 'sizeMode' | 'aspectRatio' | 'fillMode'>;

function expandImageSizeMode(value: string | undefined): ExpandImageSizeMode {
  return value === ExpandImageSizeMode.Margins
    ? ExpandImageSizeMode.Margins
    : ExpandImageSizeMode.AspectRatio;
}

function expandImageFillMode(value: string | undefined): ExpandImageFillMode {
  return value === ExpandImageFillMode.Smart
    ? ExpandImageFillMode.Smart
    : ExpandImageFillMode.Color;
}

function expandImagePreferences(appSettings: AppSettings): ExpandImagePreferences {
  return {
    sizeMode: expandImageSizeMode(appSettings.expandSizeMode),
    aspectRatio:
      imageAspectRatio(appSettings.expandAspectRatio ?? '') ??
      DEFAULT_EXPAND_IMAGE_CONTROLS.aspectRatio,
    fillMode: expandImageFillMode(appSettings.expandFillMode),
  };
}

async function prepareExpansionModelInput({
  image,
  expansion,
  signal,
}: {
  image: ImageBitmap;
  expansion: ImageExpansion;
  signal: AbortSignal;
}): Promise<OffscreenCanvas> {
  const inputImage = await createImageBitmap(image);
  try {
    signal.throwIfAborted();
    return drawExpandedImage(inputImage, expansion, '#fff')[0];
  } finally {
    inputImage.close();
  }
}

async function createExpansionMarginPatches({
  image,
  expansion,
  model,
  upscaleModel,
  auth,
  progressCallback,
  signal,
}: {
  image: ImageBitmap;
  expansion: ImageExpansion;
  model: OnnxModel;
  upscaleModel: OnnxModel;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<Blob[]> {
  const expandedCanvas = await prepareExpansionModelInput({image, expansion, signal});
  const modelImage = await transformImage({
    images: [expandedCanvas, createExpansionMask(expansion)],
    model,
    auth,
    progressCallback,
    signal,
    interpolation: null,
  });
  signal.throwIfAborted();
  const expandedImage = await fitInpaintedImage({
    image: modelImage,
    target: expansion.bounds,
    upscaleModel,
    auth,
    progressCallback,
    signal,
  });
  const marginPatches: Blob[] = [];
  for (const margin of expansion.margins) {
    marginPatches.push(
      await imageToBlob(expandedImage, {
        drawImage: DrawImage.cropRectangle(inpaintingPatchRectangle(margin, expansion.bounds)),
      })
    );
    signal.throwIfAborted();
  }
  return marginPatches;
}

type ExpandImageSliceDependencies = Pick<AppSlice, 'saveAppSettings'> &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

export const createExpandImageSlice: StateCreator<
  ExpandImageSlice & ExpandImageSliceDependencies,
  [],
  [],
  ExpandImageSlice
> = (set, get) => {
  let preferredControls: ExpandImagePreferences = {
    sizeMode: DEFAULT_EXPAND_IMAGE_CONTROLS.sizeMode,
    aspectRatio: DEFAULT_EXPAND_IMAGE_CONTROLS.aspectRatio,
    fillMode: DEFAULT_EXPAND_IMAGE_CONTROLS.fillMode,
  };

  const loadExpandImageSettings = (appSettings: AppSettings): void => {
    preferredControls = expandImagePreferences(appSettings);
    set(({expandImageControls}) => ({
      expandImageControls: {
        ...expandImageControls,
        ...preferredControls,
      },
    }));
  };

  const undoneExpandImageControls = (): ExpandImageControls | undefined => {
    const command = get().undoneEditImageHistory.at(-1)?.command;
    return command?.type === EditImageCommandType.Expand ? command.controls : undefined;
  };

  // Applying consumes the margins, so only an undone edit can bring them back.
  const appliedExpandImageControls = (controls: ExpandImageControls): ExpandImageControls =>
    controls.sizeMode === ExpandImageSizeMode.Margins
      ? {...controls, marginX: 0, marginY: 0}
      : controls;

  imageEditorControls.register(ImageEditorKey.Expand, {
    reset: () => {
      const controls = undoneExpandImageControls();
      if (controls) {
        set({
          expandImageControls: controls,
        });
      }
    },
    clear: () => {
      set({
        expandImageControls: {
          ...DEFAULT_EXPAND_IMAGE_CONTROLS,
          ...preferredControls,
        },
      });
    },
    restore: command => {
      if (command.type === EditImageCommandType.Expand) {
        set({
          expandImageControls:
            undoneExpandImageControls() ?? appliedExpandImageControls(command.controls),
        });
      }
    },
  });

  return {
    expandImageControls: DEFAULT_EXPAND_IMAGE_CONTROLS,

    loadExpandImageSettings,

    setExpandImageControls: (expandImageControls: ExpandImageControls): void => {
      const settings: Partial<AppSettings> = {};
      if (preferredControls.sizeMode !== expandImageControls.sizeMode) {
        settings.expandSizeMode = expandImageControls.sizeMode;
      }
      if (
        imageAspectRatioLabel(preferredControls.aspectRatio) !==
        imageAspectRatioLabel(expandImageControls.aspectRatio)
      ) {
        settings.expandAspectRatio = imageAspectRatioLabel(expandImageControls.aspectRatio);
      }
      if (preferredControls.fillMode !== expandImageControls.fillMode) {
        settings.expandFillMode = expandImageControls.fillMode;
      }
      preferredControls = {
        sizeMode: expandImageControls.sizeMode,
        aspectRatio: expandImageControls.aspectRatio,
        fillMode: expandImageControls.fillMode,
      };
      set({
        expandImageControls,
      });
      if (Object.keys(settings).length > 0) {
        void get().saveAppSettings(settings);
      }
    },

    setExpandImageModel: (expandImageModel: OnnxModel | undefined): void => {
      if (get().expandImageModel === expandImageModel) {
        return;
      }
      set({
        expandImageModel,
      });
    },

    setExpandImageUpscaleModel: (expandImageUpscaleModel: OnnxModel | undefined): void => {
      if (get().expandImageUpscaleModel === expandImageUpscaleModel) {
        return;
      }
      set({
        expandImageUpscaleModel,
      });
    },

    expandImage: async (): Promise<boolean> => {
      const {expandImageControls, expandImageModel, expandImageUpscaleModel, auth} = get();
      if (
        expandImageControls.fillMode === ExpandImageFillMode.Smart &&
        (!expandImageModel ||
          !hasAccessTo(auth?.user, expandImageModel) ||
          !expandImageUpscaleModel ||
          !hasAccessTo(auth?.user, expandImageUpscaleModel))
      ) {
        return false;
      }
      const applied = await get().editImageOperation.execute(
        async ({image, setDownloadTip, signal}) => {
          const expansion = getImageExpansion(image, expandImageControls);
          if (expansion.margins.length === 0) {
            return null;
          }
          if (expandImageControls.fillMode === ExpandImageFillMode.Color) {
            return {
              type: EditImageCommandType.Expand,
              controls: expandImageControls,
            };
          }

          const marginPatches = await createExpansionMarginPatches({
            image,
            expansion,
            model: expandImageModel!,
            upscaleModel: expandImageUpscaleModel!,
            auth,
            progressCallback: (key, progress) => {
              setDownloadTip(formatFetchProgress(key, progress));
            },
            signal,
          });
          if (
            get().expandImageModel !== expandImageModel ||
            get().expandImageUpscaleModel !== expandImageUpscaleModel
          ) {
            throw createAbortError();
          }
          return {
            type: EditImageCommandType.Expand,
            controls: expandImageControls,
            marginPatches,
          };
        }
      );
      if (applied) {
        set({
          expandImageControls: appliedExpandImageControls(expandImageControls),
        });
      }
      return applied;
    },
  };
};
