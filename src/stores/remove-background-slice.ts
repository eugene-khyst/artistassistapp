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
import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import {createBackgroundMask} from '@/services/image/remove-background';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageHistoryEntry, EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import {imageBitmapToBlob} from '@/utils/graphics';
import {createAbortError} from '@/utils/promise';

export interface RemoveBackgroundSlice {
  removeBackgroundColor: string | null;
  removeBackgroundModel?: OnnxModel;

  resetRemoveBackground: () => void;
  setRemoveBackgroundColor: (backgroundRemovalColor: string | null) => void;
  setRemoveBackgroundModel: (backgroundRemovalModel: OnnxModel | undefined) => void;
  removeBackground: () => Promise<void>;
}

type RemoveBackgroundSliceDependencies = Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'editImageHistory'>;

type RemoveBackgroundCommand = Extract<
  EditImageCommand,
  {type: EditImageCommandType.RemoveBackground}
>;

// The mask lives in the command, so the color can only be changed while that edit is still last.
export function editableBackgroundCommand(
  editImageHistory: readonly EditImageHistoryEntry[]
): RemoveBackgroundCommand | undefined {
  const last = editImageHistory.at(-1);
  return last?.replaceable && last.command.type === EditImageCommandType.RemoveBackground
    ? last.command
    : undefined;
}

export const createRemoveBackgroundSlice: StateCreator<
  RemoveBackgroundSlice & RemoveBackgroundSliceDependencies,
  [],
  [],
  RemoveBackgroundSlice
> = (set, get) => {
  const resetRemoveBackground = (): void => {
    set({
      removeBackgroundColor: null,
    });
  };

  imageEditorControls.register(ImageEditorKey.RemoveBackground, {
    reset: resetRemoveBackground,
    restore: command => {
      if (command.type === EditImageCommandType.RemoveBackground) {
        set({
          removeBackgroundColor: command.backgroundColor,
        });
      }
    },
  });

  return {
    removeBackgroundColor: null,

    resetRemoveBackground,

    setRemoveBackgroundColor: (backgroundRemovalColor: string | null): void => {
      set({
        removeBackgroundColor: backgroundRemovalColor,
      });
      const command = editableBackgroundCommand(get().editImageHistory);
      if (!command) {
        return;
      }
      const updatedCommand: RemoveBackgroundCommand = {
        ...command,
        backgroundColor: backgroundRemovalColor,
      };
      void get().editImageOperation.preview(updatedCommand);
    },

    setRemoveBackgroundModel: (backgroundRemovalModel: OnnxModel | undefined): void => {
      if (get().removeBackgroundModel === backgroundRemovalModel) {
        return;
      }
      set({
        removeBackgroundModel: backgroundRemovalModel,
      });
    },

    removeBackground: async (): Promise<void> => {
      const {removeBackgroundModel: backgroundRemovalModel, auth} = get();
      if (!backgroundRemovalModel || !hasAccessTo(auth?.user, backgroundRemovalModel)) {
        return;
      }
      await get().editImageOperation.preview(async ({image, setDownloadTip, signal}) => {
        // A superseding edit can close the store's image while inference still reads it.
        const inputImage = await createImageBitmap(image);
        try {
          signal.throwIfAborted();
          const mask = await createBackgroundMask(
            inputImage,
            backgroundRemovalModel,
            auth,
            (key, progress) => {
              setDownloadTip(formatFetchProgress(key, progress));
            },
            signal
          );
          try {
            signal.throwIfAborted();
            const maskBlob = await imageBitmapToBlob(mask, {
              encodeOptions: {type: 'image/png'},
            });
            signal.throwIfAborted();
            if (get().removeBackgroundModel !== backgroundRemovalModel) {
              throw createAbortError();
            }
            return {
              type: EditImageCommandType.RemoveBackground,
              mask: maskBlob,
              backgroundColor: get().removeBackgroundColor,
            };
          } finally {
            mask.close();
          }
        } finally {
          inputImage.close();
        }
      });
    },
  };
};
