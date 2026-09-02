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
import {IMAGE_SIZE, ResizeImage, resizeImageBitmap} from '@/utils/graphics';

export interface AdjustColorsSlice {
  adjustColorsControls: AdjustColorsControls;

  setAdjustColorsControls: (controls: Partial<AdjustColorsControls>) => void;
  resetAdjustColors: () => void;
  openAdjustColors: () => Promise<void>;
  previewAdjustColors: () => Promise<void>;
}

type AdjustColorsSliceDependencies = Pick<
  EditImageSlice,
  'editImageOperation' | 'editImageHistory'
>;

export const createAdjustColorsSlice: StateCreator<
  AdjustColorsSlice & AdjustColorsSliceDependencies,
  [],
  [],
  AdjustColorsSlice
> = (set, get) => {
  let percentileImage: ImageBitmap | null = null;
  let calculatedPercentile: number | undefined;
  let calculatedMaxValues: number[] | undefined;
  let shouldPreviewInitialWhiteBalance = true;

  const adjustColorsPreview = (
    controls: AdjustColorsControls
  ): EditImageCommand | EditImageCommandSupplier => {
    if (controls.whiteBalanceMethod !== AdjustColorsWhiteBalanceMethod.Percentile) {
      return {type: EditImageCommandType.AdjustColors, controls};
    }
    const percentile = controls.percentile / 100;
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
        await getRgbChannelsPercentileCalculator().setImage(transfer(resizedImage, [resizedImage]));
        signal.throwIfAborted();
        percentileImage = image;
        calculatedPercentile = undefined;
        calculatedMaxValues = undefined;
      }
      if (calculatedPercentile !== percentile || !calculatedMaxValues) {
        const maxValues =
          await getRgbChannelsPercentileCalculator().calculatePercentiles(percentile);
        signal.throwIfAborted();
        calculatedPercentile = percentile;
        calculatedMaxValues = [...maxValues];
      }
      return {
        type: EditImageCommandType.AdjustColors,
        controls,
        maxValues: [...calculatedMaxValues],
      };
    };
  };

  const hasAdjustColorsEdit = (): boolean =>
    get().editImageHistory.some(({command}) => command.type === EditImageCommandType.AdjustColors);

  const resetAdjustColors = (): void => {
    const adjustColorsControls = defaultAdjustColorsControls();
    if (!shouldPreviewInitialWhiteBalance || hasAdjustColorsEdit()) {
      adjustColorsControls.whiteBalanceMethod = AdjustColorsWhiteBalanceMethod.None;
    }
    set({
      adjustColorsControls,
    });
  };

  const clearAdjustColors = (): void => {
    shouldPreviewInitialWhiteBalance = true;
    set({
      adjustColorsControls: defaultAdjustColorsControls(),
    });
  };

  imageEditorControls.register(ImageEditorKey.AdjustColors, {
    reset: resetAdjustColors,
    clear: clearAdjustColors,
    restore: command => {
      if (command.type === EditImageCommandType.AdjustColors) {
        shouldPreviewInitialWhiteBalance = false;
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
        adjustColorsControls: {...get().adjustColorsControls, ...controls},
      });
    },

    resetAdjustColors,

    openAdjustColors: async (): Promise<void> => {
      if (!shouldPreviewInitialWhiteBalance || hasAdjustColorsEdit()) {
        return;
      }
      shouldPreviewInitialWhiteBalance = false;
      await get().editImageOperation.preview(adjustColorsPreview(get().adjustColorsControls));
    },

    previewAdjustColors: async (): Promise<void> => {
      shouldPreviewInitialWhiteBalance = false;
      await get().editImageOperation.preview(adjustColorsPreview(get().adjustColorsControls));
    },
  };
};
