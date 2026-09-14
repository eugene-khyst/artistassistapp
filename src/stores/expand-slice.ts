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
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {
  DEFAULT_EXPAND_CONTROLS,
  type ExpandControls,
  expandControlsFromAppSettings,
  expandControlsToAppSettings,
  ExpandFillMode,
  ExpandMode,
} from '@/services/image/expand-controls';
import {
  createExpansionMask,
  drawExpandedImage,
  getImageExpansion,
  type ImageExpansion,
} from '@/services/image/expand-image';
import {inpaintImage} from '@/services/image/inpaint';
import {inpaintingPatchRectangle} from '@/services/image/inpainting-patch';
import type {OnnxModel} from '@/services/ml/types';
import type {AppSettings} from '@/services/settings/types';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import type {FetchProgressCallback} from '@/utils/fetch';
import {DrawImage, imageToBlob} from '@/utils/graphics';
import {createAbortError} from '@/utils/promise';

export interface ExpandSlice {
  expandControls: ExpandControls;
  expandModel?: OnnxModel;
  expandUpscaleModel?: OnnxModel;

  loadExpandSettings: (appSettings: AppSettings) => void;
  setExpandControls: (controls: Partial<ExpandControls>) => void;
  setExpandModel: (expandModel: OnnxModel | undefined) => void;
  setExpandUpscaleModel: (expandUpscaleModel: OnnxModel | undefined) => void;
  expandImage: () => Promise<boolean>;
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
  inpaintModel,
  upscaleModel,
  auth,
  progressCallback,
  signal,
}: {
  image: ImageBitmap;
  expansion: ImageExpansion;
  inpaintModel: OnnxModel;
  upscaleModel: OnnxModel;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<Blob[]> {
  const expandedCanvas = await prepareExpansionModelInput({image, expansion, signal});
  signal.throwIfAborted();
  const expandedImage = await inpaintImage({
    images: [expandedCanvas, createExpansionMask(expansion)],
    target: expansion.bounds,
    inpaintModel,
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

type ExpandSliceDependencies = Pick<AppSlice, 'appSettings' | 'saveAppSettings'> &
  Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

export const createExpandSlice: StateCreator<
  ExpandSlice & ExpandSliceDependencies,
  [],
  [],
  ExpandSlice
> = (set, get) => {
  const loadExpandSettings = (appSettings: AppSettings): void => {
    set(({expandControls}) => ({
      expandControls: {
        ...expandControls,
        ...expandControlsFromAppSettings(appSettings),
      },
    }));
  };

  const undoneExpandControls = (): ExpandControls | undefined => {
    const command = get().undoneEditImageHistory.at(-1)?.command;
    return command?.type === EditImageCommandType.Expand ? command.controls : undefined;
  };

  // Applying consumes the margins, so only an undone edit can bring them back.
  const appliedExpandControls = (controls: ExpandControls): ExpandControls =>
    controls.sizeMode === ExpandMode.Margins ? {...controls, marginX: 0, marginY: 0} : controls;

  imageEditorControls.register(ImageEditorKey.Expand, {
    reset: () => {
      const controls = undoneExpandControls();
      if (controls) {
        set({
          expandControls: controls,
        });
      }
    },
    clear: () => {
      set({
        expandControls: {
          ...DEFAULT_EXPAND_CONTROLS,
          ...expandControlsFromAppSettings(get().appSettings),
        },
      });
    },
    restore: command => {
      if (command.type === EditImageCommandType.Expand) {
        set({
          expandControls: undoneExpandControls() ?? appliedExpandControls(command.controls),
        });
      }
    },
  });

  return {
    expandControls: DEFAULT_EXPAND_CONTROLS,

    loadExpandSettings,

    setExpandControls: (controls: Partial<ExpandControls>): void => {
      const expandControls = {
        ...get().expandControls,
        ...controls,
      };
      set({
        expandControls,
      });
      const appSettings = expandControlsToAppSettings(controls);
      if (Object.keys(appSettings).length > 0) {
        void get().saveAppSettings(appSettings);
      }
    },

    setExpandModel: (expandImageModel: OnnxModel | undefined): void => {
      if (get().expandModel === expandImageModel) {
        return;
      }
      set({
        expandModel: expandImageModel,
      });
    },

    setExpandUpscaleModel: (expandImageUpscaleModel: OnnxModel | undefined): void => {
      if (get().expandUpscaleModel === expandImageUpscaleModel) {
        return;
      }
      set({
        expandUpscaleModel: expandImageUpscaleModel,
      });
    },

    expandImage: async (): Promise<boolean> => {
      const {expandControls, expandModel, expandUpscaleModel, auth} = get();
      if (
        expandControls.fillMode === ExpandFillMode.Smart &&
        (!expandModel ||
          !expandUpscaleModel ||
          !hasAccessTo(auth?.user, [expandModel, expandUpscaleModel]))
      ) {
        return false;
      }
      const applied = await get().editImageOperation.execute(
        async ({image, setDownloadTip, signal}) => {
          const expansion = getImageExpansion(image, expandControls);
          if (expansion.margins.length === 0) {
            return null;
          }
          if (expandControls.fillMode === ExpandFillMode.Color) {
            return {
              type: EditImageCommandType.Expand,
              controls: expandControls,
            };
          }

          const marginPatches = await createExpansionMarginPatches({
            image,
            expansion,
            inpaintModel: expandModel!,
            upscaleModel: expandUpscaleModel!,
            auth,
            progressCallback: (key, progress) => {
              setDownloadTip(formatFetchProgress(key, progress));
            },
            signal,
          });
          if (
            get().expandModel !== expandModel ||
            get().expandUpscaleModel !== expandUpscaleModel
          ) {
            throw createAbortError();
          }
          return {
            type: EditImageCommandType.Expand,
            controls: expandControls,
            marginPatches,
          };
        }
      );
      if (applied) {
        set({
          expandControls: appliedExpandControls(expandControls),
        });
      }
      return applied;
    },
  };
};
