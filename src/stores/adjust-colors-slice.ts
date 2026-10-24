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

import {
  IMAGE_SIZE,
  ResizeImage,
  resizeImageBitmap,
} from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';
import {transfer} from 'comlink';
import type {StateCreator} from 'zustand';

import {ImageEditorKey} from '@/image-editor';
import {
  type AdjustColorsControls,
  AdjustColorsWhiteBalanceMethod,
  copyAdjustColorsControls,
  defaultAdjustColorsControls,
} from '@/services/image/adjust-colors-controls';
import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import {getRgbChannelsPercentileCalculator} from '@/services/image/worker/rgb-channels-percentile-worker-manager';
import type {EditImageCommandSupplier, EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';

// Auto White Balance ignores this share of pixels at each end of every channel.
const AUTO_WHITE_BALANCE_CLIP = 0.006;

export interface AdjustColorsSlice {
  adjustColorsControls: AdjustColorsControls;

  setAdjustColorsControls: (controls: Partial<AdjustColorsControls>) => void;
  resetAdjustColors: () => void;
  previewAdjustColors: () => Promise<void>;
  editImageWithAutoWhiteBalance: (imageFileToEdit: File) => Promise<void>;
}

type AdjustColorsSliceDependencies = Pick<
  EditImageSlice,
  'editImageOperation' | 'editImageHistory' | 'setImageFileToEdit' | 'setActiveImageEditorKey'
>;

export const createAdjustColorsSlice: StateCreator<
  AdjustColorsSlice & AdjustColorsSliceDependencies,
  [],
  [],
  AdjustColorsSlice
> = (set, get) => {
  let percentileImage: ImageBitmap | null = null;
  const calculatedPercentiles = new Map<number, number[]>();
  let initialWhiteBalanceMethod: AdjustColorsWhiteBalanceMethod | null =
    defaultAdjustColorsControls().whiteBalanceMethod;

  const calculatePercentiles = async (percentile: number, signal: AbortSignal) => {
    let values = calculatedPercentiles.get(percentile);
    if (!values) {
      values = await getRgbChannelsPercentileCalculator().calculatePercentiles(percentile);
      signal.throwIfAborted();
      calculatedPercentiles.set(percentile, values);
    }
    return [...values];
  };

  const adjustColorsPreview = (
    controls: AdjustColorsControls
  ): EditImageCommand | EditImageCommandSupplier => {
    const {whiteBalanceMethod} = controls;
    if (
      whiteBalanceMethod !== AdjustColorsWhiteBalanceMethod.Percentile &&
      whiteBalanceMethod !== AdjustColorsWhiteBalanceMethod.Auto
    ) {
      return {type: EditImageCommandType.AdjustColors, controls};
    }
    return async ({image, signal}) => {
      if (percentileImage !== image) {
        const resizedImage = await resizeImageBitmap(
          image,
          ResizeImage.resizeToPixelCount(IMAGE_SIZE['2K'])
        );
        if (signal.aborted) {
          resizedImage.close();
          signal.throwIfAborted();
        }
        percentileImage = null;
        calculatedPercentiles.clear();
        await getRgbChannelsPercentileCalculator().setImage(transfer(resizedImage, [resizedImage]));
        signal.throwIfAborted();
        percentileImage = image;
      }
      if (whiteBalanceMethod === AdjustColorsWhiteBalanceMethod.Auto) {
        return {
          type: EditImageCommandType.AdjustColors,
          controls,
          minValues: await calculatePercentiles(AUTO_WHITE_BALANCE_CLIP, signal),
          maxValues: await calculatePercentiles(1 - AUTO_WHITE_BALANCE_CLIP, signal),
        };
      }
      return {
        type: EditImageCommandType.AdjustColors,
        controls,
        maxValues: await calculatePercentiles(controls.percentile / 100, signal),
      };
    };
  };

  const hasAdjustColorsEdit = (): boolean =>
    get().editImageHistory.some(({command}) => command.type === EditImageCommandType.AdjustColors);

  const resetAdjustColors = (): void => {
    const adjustColorsControls = defaultAdjustColorsControls();
    adjustColorsControls.whiteBalanceMethod = hasAdjustColorsEdit()
      ? AdjustColorsWhiteBalanceMethod.None
      : (initialWhiteBalanceMethod ?? AdjustColorsWhiteBalanceMethod.None);
    set({
      adjustColorsControls,
    });
  };

  const clearAdjustColors = (): void => {
    const adjustColorsControls = defaultAdjustColorsControls();
    initialWhiteBalanceMethod = adjustColorsControls.whiteBalanceMethod;
    set({
      adjustColorsControls,
    });
  };

  const openAdjustColors = async (): Promise<void> => {
    if (initialWhiteBalanceMethod === null || hasAdjustColorsEdit()) {
      return;
    }
    initialWhiteBalanceMethod = null;
    await get().editImageOperation.preview(adjustColorsPreview(get().adjustColorsControls));
  };

  imageEditorControls.register(ImageEditorKey.AdjustColors, {
    open: openAdjustColors,
    reset: resetAdjustColors,
    clear: clearAdjustColors,
    restore: command => {
      if (command.type === EditImageCommandType.AdjustColors) {
        initialWhiteBalanceMethod = null;
        set({
          adjustColorsControls: copyAdjustColorsControls(command.controls),
        });
      }
    },
  });

  return {
    adjustColorsControls: defaultAdjustColorsControls(),

    setAdjustColorsControls: (controls: Partial<AdjustColorsControls>): void => {
      set({
        adjustColorsControls: {
          ...get().adjustColorsControls,
          ...controls,
        },
      });
    },

    resetAdjustColors,

    previewAdjustColors: async (): Promise<void> => {
      initialWhiteBalanceMethod = null;
      await get().editImageOperation.preview(adjustColorsPreview(get().adjustColorsControls));
    },

    editImageWithAutoWhiteBalance: async (imageFileToEdit: File): Promise<void> => {
      if (!(await get().setImageFileToEdit(imageFileToEdit))) {
        return;
      }
      initialWhiteBalanceMethod = AdjustColorsWhiteBalanceMethod.Auto;
      await get().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    },
  };
};
