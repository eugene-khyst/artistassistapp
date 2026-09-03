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

import {WHITE_HEX} from '@eugene-khyst/artistassistapp-color-mixer';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {ImageEditorKey} from '@/image-editor';
import {
  type AdjustColorsControls,
  AdjustColorsWhiteBalanceMethod,
} from '@/services/image/adjust-colors-controls';
import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import {type AdjustColorsSlice, createAdjustColorsSlice} from '@/stores/adjust-colors-slice';
import type {
  EditImageCommandSupplier,
  EditImageContext,
  EditImageOperation,
  EditImageSlice,
} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';

const imageOperations = vi.hoisted(() => ({
  calculatePercentiles: vi.fn(),
  resizeImageBitmap: vi.fn(),
  setImage: vi.fn(),
}));

vi.mock('comlink', () => ({
  transfer: vi.fn((value: unknown) => value),
}));

vi.mock('@/services/image/worker/rgb-channels-percentile-worker-manager', () => ({
  getRgbChannelsPercentileCalculator: () => ({
    calculatePercentiles: imageOperations.calculatePercentiles,
    setImage: imageOperations.setImage,
  }),
}));

vi.mock('@/utils/graphics', () => ({
  IMAGE_SIZE: {'2K': 2_000_000},
  ResizeImage: {resizeToPixelCount: vi.fn()},
  resizeImageBitmap: imageOperations.resizeImageBitmap,
}));

type TestStore = AdjustColorsSlice &
  Pick<EditImageSlice, 'editImageHistory' | 'editImageOperation'>;

function createImage(): ImageBitmap {
  return {close: vi.fn()} as unknown as ImageBitmap;
}

function adjustColorsControls(overrides: Partial<AdjustColorsControls> = {}): AdjustColorsControls {
  return {
    whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.Percentile,
    percentile: 98,
    whitePoint: WHITE_HEX,
    saturation: 100,
    inputLevels: [0, 255],
    gammaPercent: 50,
    outputLevels: [0, 255],
    originalTemperature: 6500,
    targetTemperature: 6500,
    ...overrides,
  };
}

function createTestStore(initialImage: ImageBitmap) {
  let image = initialImage;
  let previewCommand: EditImageCommand | null = null;
  const applyPreview = async (
    commandOrSupplier: EditImageCommand | EditImageCommandSupplier
  ): Promise<boolean> => {
    previewCommand =
      typeof commandOrSupplier === 'function'
        ? await commandOrSupplier({
            image,
            signal: new AbortController().signal,
            setDownloadTip: vi.fn(),
            setProcessTip: vi.fn(),
          } satisfies EditImageContext<ImageBitmap>)
        : commandOrSupplier;
    return previewCommand !== null;
  };
  const preview = vi.fn(applyPreview);
  const editImageOperation: EditImageOperation = {
    run: vi.fn(),
    preview,
    execute: vi.fn(),
    abort: vi.fn(),
  };
  const store = createStore<TestStore>()((...args) => ({
    editImageHistory: [],
    editImageOperation,
    ...createAdjustColorsSlice(...args),
  }));
  return {
    store,
    preview,
    getPreviewCommand: () => previewCommand,
    setImage: (updatedImage: ImageBitmap) => {
      image = updatedImage;
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('AdjustColorsSlice', () => {
  it('resets control values to their defaults', () => {
    const {store} = createTestStore(createImage());
    store.getState().setAdjustColorsControls({
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.WhitePoint,
      percentile: 90,
      saturation: 120,
      inputLevels: [10, 240],
    });

    store.getState().resetAdjustColors();

    expect(store.getState().adjustColorsControls).toEqual({
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.Percentile,
      percentile: 98,
      whitePoint: WHITE_HEX,
      saturation: 100,
      inputLevels: [0, 255],
      gammaPercent: 50,
      outputLevels: [0, 255],
      originalTemperature: 6500,
      targetTemperature: 6500,
    });
  });

  it('changes controls without previewing them', () => {
    const {store, preview} = createTestStore(createImage());

    store.getState().setAdjustColorsControls({
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
      saturation: 110,
    });
    store.getState().setAdjustColorsControls({
      saturation: 120,
      inputLevels: [10, 240],
    });

    expect(preview).not.toHaveBeenCalled();
    expect(store.getState().adjustColorsControls).toMatchObject({
      saturation: 120,
      inputLevels: [10, 240],
    });
  });

  it('previews the current control snapshot', async () => {
    const {store, preview, getPreviewCommand} = createTestStore(createImage());
    store.setState({
      adjustColorsControls: adjustColorsControls({
        whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
        saturation: 120,
      }),
    });

    await store.getState().previewAdjustColors();

    expect(preview).toHaveBeenCalledOnce();
    expect(getPreviewCommand()).toEqual({
      type: EditImageCommandType.AdjustColors,
      controls: store.getState().adjustColorsControls,
    });
  });

  it('does not preview controls it just restored', async () => {
    const {store, preview} = createTestStore(createImage());
    const controls = adjustColorsControls({
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
      saturation: 120,
    });
    const command: EditImageCommand = {type: EditImageCommandType.AdjustColors, controls};
    store.setState({editImageHistory: [{command, replaceable: true}]});
    imageEditorControls.restore(ImageEditorKey.AdjustColors, command);

    await store.getState().openAdjustColors();

    expect(preview).not.toHaveBeenCalled();
    expect(store.getState().adjustColorsControls).toEqual(controls);

    store.getState().setAdjustColorsControls({saturation: 130});
    await store.getState().previewAdjustColors();

    expect(preview).toHaveBeenCalledOnce();
  });

  it('offers the initial white balance once and leaves it off after reset', async () => {
    const resizedImage = createImage();
    imageOperations.resizeImageBitmap.mockResolvedValue(resizedImage);
    imageOperations.calculatePercentiles.mockResolvedValue([0.9, 0.8, 0.7]);
    const {store, preview} = createTestStore(createImage());

    await store.getState().openAdjustColors();

    expect(preview).toHaveBeenCalledOnce();
    expect(store.getState().adjustColorsControls.whiteBalanceMethod).toBe(
      AdjustColorsWhiteBalanceMethod.Percentile
    );

    imageEditorControls.reset(ImageEditorKey.AdjustColors);
    await store.getState().openAdjustColors();

    expect(store.getState().adjustColorsControls.whiteBalanceMethod).toBe(
      AdjustColorsWhiteBalanceMethod.None
    );
    expect(preview).toHaveBeenCalledOnce();

    store.getState().setAdjustColorsControls({
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.WhitePoint,
    });
    await store.getState().previewAdjustColors();

    expect(preview).toHaveBeenCalledTimes(2);

    imageEditorControls.resetAll();

    expect(store.getState().adjustColorsControls.whiteBalanceMethod).toBe(
      AdjustColorsWhiteBalanceMethod.Percentile
    );
  });

  it('waits for non-percentile previews', async () => {
    const {store, preview} = createTestStore(createImage());
    preview.mockRejectedValueOnce(new Error('Preview failed'));
    store.setState({
      adjustColorsControls: adjustColorsControls({
        whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
      }),
    });

    await expect(store.getState().previewAdjustColors()).rejects.toThrow('Preview failed');
  });

  it('caches percentile values for the current committed image', async () => {
    const image = createImage();
    const resizedImage = createImage();
    imageOperations.resizeImageBitmap.mockResolvedValueOnce(resizedImage);
    imageOperations.calculatePercentiles.mockResolvedValueOnce([0.9, 0.8, 0.7]);
    const {store, getPreviewCommand} = createTestStore(image);

    store.setState({adjustColorsControls: adjustColorsControls({saturation: 100})});
    await store.getState().previewAdjustColors();
    store.setState({adjustColorsControls: adjustColorsControls({saturation: 110})});
    await store.getState().previewAdjustColors();

    expect(imageOperations.resizeImageBitmap).toHaveBeenCalledOnce();
    expect(imageOperations.setImage).toHaveBeenCalledOnce();
    expect(imageOperations.calculatePercentiles).toHaveBeenCalledOnce();
    expect(getPreviewCommand()).toMatchObject({
      type: EditImageCommandType.AdjustColors,
      controls: {saturation: 110},
      maxValues: [0.9, 0.8, 0.7],
    });
  });

  it('prepares the percentile calculator again when the committed image changes', async () => {
    const firstImage = createImage();
    const secondImage = createImage();
    imageOperations.resizeImageBitmap
      .mockResolvedValueOnce(createImage())
      .mockResolvedValueOnce(createImage());
    imageOperations.calculatePercentiles
      .mockResolvedValueOnce([0.9, 0.8, 0.7])
      .mockResolvedValueOnce([0.6, 0.5, 0.4]);
    const {store, setImage} = createTestStore(firstImage);

    await store.getState().previewAdjustColors();
    setImage(secondImage);
    await store.getState().previewAdjustColors();

    expect(imageOperations.resizeImageBitmap).toHaveBeenCalledTimes(2);
    expect(imageOperations.setImage).toHaveBeenCalledTimes(2);
    expect(imageOperations.calculatePercentiles).toHaveBeenCalledTimes(2);
  });
});
