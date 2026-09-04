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

import {afterEach, beforeEach, describe, expect, it, type Mock, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {ImageEditorKey} from '@/image-editor';
import {
  type AdjustColorsControls,
  AdjustColorsWhiteBalanceMethod,
} from '@/services/image/adjust-colors-controls';
import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import {type AdjustColorsSlice, createAdjustColorsSlice} from '@/stores/adjust-colors-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import {createEditImageSlice, type EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import {
  createRemoveBackgroundSlice,
  type RemoveBackgroundSlice,
} from '@/stores/remove-background-slice';

const commandService = vi.hoisted(() => ({
  apply: vi.fn(),
}));

vi.mock('@/services/image/edit-image', () => ({
  applyEditImageCommand: commandService.apply,
}));

vi.mock('@/i18n', () => ({
  formatFetchProgress: vi.fn(),
}));

vi.mock('comlink', () => ({
  transfer: vi.fn((value: unknown) => value),
}));

vi.mock('@/services/image/remove-background', () => ({
  createBackgroundMask: vi.fn(),
}));

vi.mock('@/services/image/worker/rgb-channels-percentile-worker-manager', () => ({
  getRgbChannelsPercentileCalculator: () => ({
    calculatePercentiles: vi.fn(),
    setImage: vi.fn(),
  }),
}));

vi.mock('@/utils/graphics', () => ({
  IMAGE_SIZE: {'2K': 2_000_000},
  ResizeImage: {resizeToPixelCount: vi.fn()},
  imageToBlob: vi.fn(),
  resizeImageBitmap: vi.fn(),
}));

function createImage(): ImageBitmap {
  return {close: vi.fn()} as unknown as ImageBitmap;
}

function defaultTestAdjustColorsControls(): AdjustColorsControls {
  return {
    whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.Percentile,
    percentile: 98,
    whitePoint: '#FFF',
    saturation: 100,
    inputLevels: [0, 255],
    gammaPercent: 50,
    outputLevels: [0, 255],
    originalTemperature: 6500,
    targetTemperature: 6500,
  };
}

function adjustColorsCommand(saturation = 100): EditImageCommand {
  return {
    type: EditImageCommandType.AdjustColors,
    controls: {...defaultTestAdjustColorsControls(), saturation},
  };
}

interface TestImageEditorControls {
  resetAdjustColors: Mock<() => void>;
  resetCrop: Mock<() => void>;
  resetRemoveBackground: Mock<() => void>;
}

let editorControls: TestImageEditorControls;

function registerTestImageEditorControls(): TestImageEditorControls {
  const controls: TestImageEditorControls = {
    resetAdjustColors: vi.fn(),
    resetCrop: vi.fn(),
    resetRemoveBackground: vi.fn(),
  };
  imageEditorControls.register(ImageEditorKey.AdjustColors, {reset: controls.resetAdjustColors});
  imageEditorControls.register(ImageEditorKey.Crop, {clear: controls.resetCrop});
  imageEditorControls.register(ImageEditorKey.RemoveBackground, {
    reset: controls.resetRemoveBackground,
  });
  return controls;
}

function createEditImageStore() {
  return createStore<EditImageSlice>()((...args) => createEditImageSlice(...args));
}

type IntegratedEditImageStore = AdjustColorsSlice &
  RemoveBackgroundSlice &
  EditImageSlice &
  Pick<AuthSlice, 'auth'>;

function createIntegratedEditImageStore() {
  return createStore<IntegratedEditImageStore>()((...args) => ({
    auth: null,
    ...createAdjustColorsSlice(...args),
    ...createRemoveBackgroundSlice(...args),
    ...createEditImageSlice(...args),
  }));
}

async function loadImage(store: {getState: () => Pick<EditImageSlice, 'setImageFileToEdit'>}) {
  const imageToEdit = createImage();
  const editedImage = createImage();
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValueOnce(imageToEdit).mockResolvedValueOnce(editedImage)
  );
  await store.getState().setImageFileToEdit(new Blob() as File);
  return {imageToEdit, editedImage};
}

function clearEditorResetActions(): void {
  editorControls.resetAdjustColors.mockClear();
  editorControls.resetCrop.mockClear();
  editorControls.resetRemoveBackground.mockClear();
}

beforeEach(() => {
  editorControls = registerTestImageEditorControls();
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('EditImageSlice', () => {
  it('owns loading and download-tip state for edit operations', async () => {
    const store = createEditImageStore();
    let finish: () => void = () => undefined;
    const pending = new Promise<void>(resolve => {
      finish = resolve;
    });

    const operation = store
      .getState()
      .editImageOperation.withEditedImage(async ({setDownloadTip}) => {
        setDownloadTip('Downloading');
        await pending;
      });

    expect(store.getState()).toMatchObject({
      isEditedImageLoading: true,
      editImageDownloadTip: 'Downloading',
    });

    finish();
    await operation;

    expect(store.getState()).toMatchObject({
      isEditedImageLoading: false,
      editImageDownloadTip: null,
    });
  });

  it('creates independently owned original and committed images', async () => {
    const store = createEditImageStore();
    const {imageToEdit, editedImage} = await loadImage(store);
    clearEditorResetActions();

    expect(store.getState()).toMatchObject({
      imageToEdit,
      editedImage,
      editImageHistory: [],
      undoneEditImageHistory: [],
    });
  });

  it('keeps the preview in history when switching modes', async () => {
    const store = createEditImageStore();
    const {imageToEdit, editedImage} = await loadImage(store);
    clearEditorResetActions();
    const previewImage = createImage();
    commandService.apply.mockResolvedValueOnce(previewImage);
    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    const command: EditImageCommand = adjustColorsCommand(50);
    await store.getState().editImageOperation.preview(command);

    expect(store.getState().editedImage).toBe(previewImage);

    clearEditorResetActions();
    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);

    expect(store.getState()).toMatchObject({
      editedImage: previewImage,
      editImageHistory: [{command, replaceable: true}],
      activeImageEditorKey: ImageEditorKey.Crop,
    });
    expect(editorControls.resetAdjustColors).toHaveBeenCalledOnce();
    expect(editedImage.close).not.toHaveBeenCalled();
    expect(imageToEdit.close).not.toHaveBeenCalled();
  });

  it('restores the editor controls when returning to it', async () => {
    const store = createIntegratedEditImageStore();
    await loadImage(store);
    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    const controls: AdjustColorsControls = {
      ...defaultTestAdjustColorsControls(),
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
      saturation: 120,
    };
    store.setState({adjustColorsControls: controls});
    commandService.apply.mockResolvedValueOnce(createImage());
    await store.getState().previewAdjustColors();

    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);

    // reset to defaults, but without the automatic white balance the history already applied
    expect(store.getState().adjustColorsControls).toEqual({
      ...defaultTestAdjustColorsControls(),
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
    });

    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);

    expect(store.getState().adjustColorsControls).toEqual(controls);
  });

  it('keeps the crop aspect ratio when switching modes', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    clearEditorResetActions();

    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    store.getState().setActiveImageEditorKey(ImageEditorKey.RemoveBackground);

    expect(editorControls.resetCrop).not.toHaveBeenCalled();
  });

  it('leaves the history unchanged when a supplier produces no command', async () => {
    const store = createEditImageStore();
    const {editedImage} = await loadImage(store);

    await expect(store.getState().editImageOperation.preview(() => null)).resolves.toBe(false);

    expect(commandService.apply).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      editedImage,
      editImageHistory: [],
      undoneEditImageHistory: [],
      isEditedImageLoading: false,
    });
  });

  it('applies a cumulative command on top of the preview', async () => {
    const store = createEditImageStore();
    const {editedImage} = await loadImage(store);
    const previewImage = createImage();
    const rotatedImage = createImage();
    const previewCommand: EditImageCommand = adjustColorsCommand(120);
    const executeCommand: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    commandService.apply.mockResolvedValueOnce(previewImage).mockResolvedValueOnce(rotatedImage);
    await store.getState().editImageOperation.preview(previewCommand);

    await store.getState().editImageOperation.execute(executeCommand);

    expect(commandService.apply).toHaveBeenNthCalledWith(
      2,
      previewImage,
      executeCommand,
      expect.any(AbortSignal)
    );
    expect(store.getState()).toMatchObject({
      editedImage: rotatedImage,
      editImageHistory: [
        {command: previewCommand, replaceable: true},
        {command: executeCommand, replaceable: false},
      ],
      undoneEditImageHistory: [],
    });
    expect(editedImage.close).toHaveBeenCalledOnce();
    expect(previewImage.close).not.toHaveBeenCalled();
    expect(rotatedImage.close).not.toHaveBeenCalled();
  });

  it('undoes to the previous preview of the same editor', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const firstPreview = createImage();
    const secondPreview = createImage();
    const restoredFirstPreview = createImage();
    commandService.apply
      .mockResolvedValueOnce(firstPreview)
      .mockResolvedValueOnce(secondPreview)
      .mockResolvedValueOnce(restoredFirstPreview);
    const firstCommand: EditImageCommand = adjustColorsCommand(120);
    const secondCommand: EditImageCommand = adjustColorsCommand(130);

    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    await store.getState().editImageOperation.preview(firstCommand);
    await store.getState().editImageOperation.preview(secondCommand);

    expect(store.getState()).toMatchObject({
      editedImage: secondPreview,
      editImageHistory: [
        {command: firstCommand, replaceable: true},
        {command: secondCommand, replaceable: true},
      ],
    });

    await store.getState().undoEditImage();

    expect(store.getState()).toMatchObject({
      editedImage: restoredFirstPreview,
      editImageHistory: [{command: firstCommand, replaceable: true}],
      undoneEditImageHistory: [{command: secondCommand, replaceable: true}],
      activeImageEditorKey: ImageEditorKey.AdjustColors,
    });

    await store.getState().undoEditImage();

    expect(store.getState().editImageHistory).toEqual([]);
    expect(store.getState().undoneEditImageHistory).toEqual([
      {command: secondCommand, replaceable: true},
      {command: firstCommand, replaceable: true},
    ]);
  });

  it('keeps the same source image behind successive previews of one editor', async () => {
    const store = createEditImageStore();
    const {editedImage} = await loadImage(store);
    commandService.apply
      .mockResolvedValueOnce(createImage())
      .mockResolvedValueOnce(createImage())
      .mockResolvedValueOnce(createImage());
    const sourceImages: (ImageBitmap | null)[] = [];
    const previewSupplying = (command: EditImageCommand) => (context: {image: ImageBitmap}) => {
      sourceImages.push(context.image);
      return command;
    };

    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    await store.getState().editImageOperation.preview(previewSupplying(adjustColorsCommand(110)));
    await store.getState().editImageOperation.preview(previewSupplying(adjustColorsCommand(120)));
    await store.getState().editImageOperation.preview(previewSupplying(adjustColorsCommand(130)));

    expect(sourceImages).toEqual([editedImage, editedImage, editedImage]);
    expect(store.getState().imageBeforeLastEdit).toBe(editedImage);
  });

  it('applies both edits from one editor when another edit separates them', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const firstAdjustedImage = createImage();
    const rotatedImage = createImage();
    const secondAdjustedImage = createImage();
    commandService.apply
      .mockResolvedValueOnce(firstAdjustedImage)
      .mockResolvedValueOnce(rotatedImage)
      .mockResolvedValueOnce(secondAdjustedImage);
    const firstAdjust: EditImageCommand = adjustColorsCommand(120);
    const rotate: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const secondAdjust: EditImageCommand = adjustColorsCommand(130);

    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    await store.getState().editImageOperation.preview(firstAdjust);
    await store.getState().editImageOperation.execute(rotate);
    await store.getState().editImageOperation.preview(secondAdjust);

    expect(commandService.apply).toHaveBeenLastCalledWith(
      rotatedImage,
      secondAdjust,
      expect.any(AbortSignal)
    );
    expect(store.getState()).toMatchObject({
      editedImage: secondAdjustedImage,
      editImageHistory: [
        {command: firstAdjust, replaceable: true},
        {command: rotate, replaceable: false},
        {command: secondAdjust, replaceable: true},
      ],
    });
  });

  it('previews from the image before its own edit after an undo dropped the cached base', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const adjustedImage = createImage();
    const rotatedImage = createImage();
    const replayedBase = createImage();
    const secondAdjustedImage = createImage();
    commandService.apply.mockResolvedValueOnce(adjustedImage).mockResolvedValueOnce(rotatedImage);

    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    await store.getState().editImageOperation.preview(adjustColorsCommand(120));
    await store.getState().editImageOperation.execute({
      type: EditImageCommandType.RotateClockwise,
    });
    vi.mocked(createImageBitmap).mockResolvedValueOnce(replayedBase);
    await store.getState().undoEditImage();
    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);

    const imageBeforeLastEdit = store.getState().imageBeforeLastEdit;
    expect(imageBeforeLastEdit).not.toBeNull();

    const sourceImages: ImageBitmap[] = [];
    const secondAdjust = adjustColorsCommand(130);
    commandService.apply.mockResolvedValueOnce(secondAdjustedImage);
    await store.getState().editImageOperation.preview(({image}) => {
      sourceImages.push(image);
      return secondAdjust;
    });

    expect(sourceImages).toEqual([imageBeforeLastEdit]);
    expect(commandService.apply).toHaveBeenLastCalledWith(
      imageBeforeLastEdit,
      secondAdjust,
      expect.any(AbortSignal)
    );
  });

  it('replaces a superseded preview instead of stacking it', async () => {
    const store = createEditImageStore();
    const {editedImage} = await loadImage(store);
    const firstPreview = createImage();
    const secondPreview = createImage();
    commandService.apply.mockResolvedValueOnce(firstPreview).mockResolvedValueOnce(secondPreview);
    const secondCommand: EditImageCommand = adjustColorsCommand(130);

    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    await store.getState().editImageOperation.preview(adjustColorsCommand(120));
    await store.getState().editImageOperation.preview(secondCommand);

    expect(commandService.apply).toHaveBeenLastCalledWith(
      editedImage,
      secondCommand,
      expect.any(AbortSignal)
    );
    expect(firstPreview.close).toHaveBeenCalledOnce();
  });

  it('undoes a preview without re-applying the commands it keeps', async () => {
    const store = createEditImageStore();
    const {imageToEdit} = await loadImage(store);
    clearEditorResetActions();
    vi.mocked(createImageBitmap).mockClear();
    const rotatedImage = createImage();
    const straightenedPreview = createImage();
    const replayedBase = createImage();
    commandService.apply
      .mockResolvedValueOnce(rotatedImage)
      .mockResolvedValueOnce(straightenedPreview);

    const rotateCommand: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const straightenCommand: EditImageCommand = {
      type: EditImageCommandType.Straighten,
      vertices: [
        {x: 0, y: 0},
        {x: 1, y: 0},
        {x: 1, y: 1},
        {x: 0, y: 1},
      ],
    };
    store.getState().setActiveImageEditorKey(ImageEditorKey.Straighten);
    await store.getState().editImageOperation.execute(rotateCommand);
    await store.getState().editImageOperation.preview(straightenCommand);

    commandService.apply.mockClear();
    vi.mocked(createImageBitmap).mockClear();
    await store.getState().undoEditImage();

    expect(straightenedPreview.close).toHaveBeenCalledOnce();
    // the kept command is not replaceable, so its prefix is never needed
    expect(commandService.apply).not.toHaveBeenCalled();
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(store.getState().imageBeforeLastEdit).toBeNull();
    expect(store.getState()).toMatchObject({
      editedImage: rotatedImage,
      editImageHistory: [{command: rotateCommand, replaceable: false}],
      undoneEditImageHistory: [{command: straightenCommand, replaceable: true}],
      activeImageEditorKey: ImageEditorKey.Straighten,
    });

    vi.mocked(createImageBitmap).mockResolvedValueOnce(replayedBase);
    await store.getState().undoEditImage();

    expect(createImageBitmap).toHaveBeenCalledExactlyOnceWith(imageToEdit);
    expect(rotatedImage.close).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({
      editedImage: replayedBase,
      editImageHistory: [],
      undoneEditImageHistory: [
        {command: straightenCommand, replaceable: true},
        {command: rotateCommand, replaceable: false},
      ],
      activeImageEditorKey: ImageEditorKey.Straighten,
    });
  });

  it('redoes the latest undone committed command', async () => {
    const store = createEditImageStore();
    const {editedImage} = await loadImage(store);
    const rotatedImage = createImage();
    const redoneImage = createImage();
    const command: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    commandService.apply.mockResolvedValueOnce(rotatedImage);
    await store.getState().editImageOperation.execute(command);

    vi.mocked(createImageBitmap).mockClear();
    await store.getState().undoEditImage();

    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(store.getState().editedImage).toBe(editedImage);
    expect(rotatedImage.close).toHaveBeenCalledOnce();

    commandService.apply.mockClear();
    commandService.apply.mockResolvedValueOnce(redoneImage);

    await store.getState().redoEditImage();

    expect(commandService.apply).toHaveBeenCalledWith(
      editedImage,
      command,
      expect.any(AbortSignal)
    );
    expect(store.getState()).toMatchObject({
      editedImage: redoneImage,
      editImageHistory: [{command, replaceable: false}],
      undoneEditImageHistory: [],
      activeImageEditorKey: ImageEditorKey.Straighten,
    });
    expect(redoneImage.close).not.toHaveBeenCalled();
  });

  it('redoes an undone preview as a replaceable preview', async () => {
    const store = createEditImageStore();
    const {editedImage} = await loadImage(store);
    const previewImage = createImage();
    const redoneImage = createImage();
    const replacementImage = createImage();
    const command: EditImageCommand = adjustColorsCommand(120);
    const replacementCommand: EditImageCommand = adjustColorsCommand(80);
    commandService.apply.mockResolvedValueOnce(previewImage);
    await store.getState().editImageOperation.preview(command);
    await store.getState().undoEditImage();
    commandService.apply.mockClear();
    commandService.apply.mockResolvedValueOnce(redoneImage);

    await store.getState().redoEditImage();

    expect(commandService.apply).toHaveBeenCalledWith(
      editedImage,
      command,
      expect.any(AbortSignal)
    );
    expect(store.getState()).toMatchObject({
      editedImage: redoneImage,
      imageBeforeLastEdit: editedImage,
      editImageHistory: [{command, replaceable: true}],
      undoneEditImageHistory: [],
      activeImageEditorKey: ImageEditorKey.AdjustColors,
    });
    expect(previewImage.close).toHaveBeenCalledOnce();
    expect(editedImage.close).not.toHaveBeenCalled();

    commandService.apply.mockClear();
    commandService.apply.mockResolvedValueOnce(replacementImage);
    await store.getState().editImageOperation.preview(replacementCommand);

    expect(commandService.apply).toHaveBeenCalledWith(
      editedImage,
      replacementCommand,
      expect.any(AbortSignal)
    );
    expect(redoneImage.close).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({
      editedImage: replacementImage,
      editImageHistory: [
        {command, replaceable: true},
        {command: replacementCommand, replaceable: true},
      ],
    });
  });

  it('redoes an Adjust Colors preview with the controls that produced it', async () => {
    const store = createIntegratedEditImageStore();
    await loadImage(store);
    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    const appliedControls: AdjustColorsControls = {
      ...defaultTestAdjustColorsControls(),
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.WhitePoint,
      saturation: 110,
      inputLevels: [10, 240],
    };
    store.setState({adjustColorsControls: appliedControls});
    commandService.apply.mockResolvedValueOnce(createImage());
    await store.getState().previewAdjustColors();
    const appliedCommand = store.getState().editImageHistory.at(-1)!.command;

    await store.getState().undoEditImage();

    expect(store.getState().undoneEditImageHistory).toEqual([
      {command: appliedCommand, replaceable: true},
    ]);
    expect(store.getState().adjustColorsControls).toEqual({
      ...defaultTestAdjustColorsControls(),
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
    });
    commandService.apply.mockClear();
    commandService.apply.mockResolvedValueOnce(createImage());

    await store.getState().redoEditImage();

    expect(commandService.apply).toHaveBeenCalledOnce();
    expect(store.getState().editImageHistory.at(-1)).toMatchObject({command: appliedCommand});
    expect(store.getState().adjustColorsControls).toEqual(appliedControls);
    expect(store.getState().adjustColorsControls.inputLevels).not.toBe(appliedControls.inputLevels);
  });

  it('restores applied controls when an edit fails', async () => {
    const store = createIntegratedEditImageStore();
    await loadImage(store);
    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    const appliedControls: AdjustColorsControls = {
      ...defaultTestAdjustColorsControls(),
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
      saturation: 110,
    };
    store.setState({adjustColorsControls: appliedControls});
    commandService.apply.mockResolvedValueOnce(createImage());
    await store.getState().previewAdjustColors();

    store.getState().setAdjustColorsControls({saturation: 130});
    commandService.apply.mockRejectedValueOnce(new Error('Adjust failed'));

    await expect(store.getState().previewAdjustColors()).rejects.toThrow('Adjust failed');

    expect(store.getState().adjustColorsControls).toEqual(appliedControls);
  });

  it('keeps a composed value when an edit fails with nothing applied', async () => {
    const store = createIntegratedEditImageStore();
    await loadImage(store);
    store.getState().setActiveImageEditorKey(ImageEditorKey.RemoveBackground);
    store.setState({removeBackgroundColor: '#ffffff'});
    commandService.apply.mockRejectedValueOnce(new Error('Remove background failed'));

    await expect(
      store.getState().editImageOperation.preview({
        type: EditImageCommandType.RemoveBackground,
        mask: new Blob(),
        backgroundColor: '#ffffff',
      })
    ).rejects.toThrow('Remove background failed');

    expect(store.getState().removeBackgroundColor).toBe('#ffffff');
  });

  it('keeps controls with nothing applied when canceling', async () => {
    const store = createIntegratedEditImageStore();
    await loadImage(store);
    store.getState().setActiveImageEditorKey(ImageEditorKey.RemoveBackground);
    store.setState({removeBackgroundColor: '#ffffff'});
    let resolvePreview: (image: ImageBitmap) => void = () => undefined;
    commandService.apply.mockImplementationOnce(
      async () =>
        await new Promise<ImageBitmap>(resolve => {
          resolvePreview = resolve;
        })
    );
    const preview = store.getState().editImageOperation.preview({
      type: EditImageCommandType.RemoveBackground,
      mask: new Blob(),
      backgroundColor: '#ffffff',
    });

    store.getState().editImageOperation.abort();
    resolvePreview(createImage());
    await preview;

    expect(store.getState().removeBackgroundColor).toBe('#ffffff');
  });

  it('restores applied Adjust Colors controls after canceling a newer preview', async () => {
    const store = createIntegratedEditImageStore();
    await loadImage(store);
    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    const appliedControls: AdjustColorsControls = {
      ...defaultTestAdjustColorsControls(),
      whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.None,
      saturation: 110,
    };
    store.setState({adjustColorsControls: appliedControls});
    const adjustedImage = createImage();
    commandService.apply.mockResolvedValueOnce(adjustedImage);
    await store.getState().previewAdjustColors();
    const stalePreviewImage = createImage();
    let resolvePreview: (image: ImageBitmap) => void = () => undefined;
    commandService.apply.mockImplementationOnce(
      async () =>
        await new Promise<ImageBitmap>(resolve => {
          resolvePreview = resolve;
        })
    );
    store.getState().setAdjustColorsControls({saturation: 120});
    const newerPreview = store.getState().previewAdjustColors();

    store.getState().editImageOperation.abort();
    resolvePreview(stalePreviewImage);
    await newerPreview;

    expect(store.getState()).toMatchObject({
      adjustColorsControls: appliedControls,
      editedImage: adjustedImage,
      isEditedImageLoading: false,
    });
    expect(stalePreviewImage.close).toHaveBeenCalledOnce();
  });

  it('restores the background color with a redone Remove Background preview', async () => {
    const store = createIntegratedEditImageStore();
    await loadImage(store);
    const backgroundColor = '#ffffff';
    store.setState({removeBackgroundColor: backgroundColor});
    const command: EditImageCommand = {
      type: EditImageCommandType.RemoveBackground,
      mask: new Blob(),
      backgroundColor,
    };
    commandService.apply.mockResolvedValueOnce(createImage());
    await store.getState().editImageOperation.preview(command);

    await store.getState().undoEditImage();

    expect(store.getState().removeBackgroundColor).toBeNull();
    commandService.apply.mockResolvedValueOnce(createImage());

    await store.getState().redoEditImage();

    expect(store.getState().removeBackgroundColor).toBe(backgroundColor);
  });

  it('clears redo history after creating a new preview', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const rotatedImage = createImage();
    const restoredImage = createImage();
    const previewImage = createImage();
    const undoneCommand: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const newCommand: EditImageCommand = adjustColorsCommand(120);
    commandService.apply.mockResolvedValueOnce(rotatedImage);
    await store.getState().editImageOperation.execute(undoneCommand);
    vi.mocked(createImageBitmap).mockResolvedValueOnce(restoredImage);
    await store.getState().undoEditImage();
    commandService.apply.mockResolvedValueOnce(previewImage);

    await store.getState().editImageOperation.preview(newCommand);

    expect(store.getState()).toMatchObject({
      editedImage: previewImage,
      editImageHistory: [{command: newCommand, replaceable: true}],
      undoneEditImageHistory: [],
    });
  });

  it('keeps redo state when reapplying a command fails', async () => {
    const store = createEditImageStore();
    const {editedImage} = await loadImage(store);
    const rotatedImage = createImage();
    const command: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    commandService.apply.mockResolvedValueOnce(rotatedImage);
    await store.getState().editImageOperation.execute(command);
    await store.getState().undoEditImage();
    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    commandService.apply.mockRejectedValueOnce(new Error('Redo failed'));

    await expect(store.getState().redoEditImage()).rejects.toThrow('Redo failed');

    expect(store.getState()).toMatchObject({
      editedImage,
      editImageHistory: [],
      undoneEditImageHistory: [{command, replaceable: false}],
      activeImageEditorKey: ImageEditorKey.Crop,
    });
    expect(editedImage.close).not.toHaveBeenCalled();
  });

  it('resets the image and clears the history', async () => {
    const store = createEditImageStore();
    const {imageToEdit, editedImage} = await loadImage(store);
    clearEditorResetActions();
    const previewImage = createImage();
    commandService.apply.mockResolvedValueOnce(previewImage);
    await store.getState().editImageOperation.preview({type: EditImageCommandType.RotateClockwise});

    await store.getState().resetEditImage();

    expect(store.getState()).toMatchObject({
      imageToEdit,
      imageBeforeLastEdit: null,
      editedImage,
      editImageHistory: [],
      undoneEditImageHistory: [],
      activeImageEditorKey: undefined,
    });
    expect(previewImage.close).toHaveBeenCalledOnce();
    expect(editedImage.close).not.toHaveBeenCalled();
    expect(imageToEdit.close).not.toHaveBeenCalled();
    expect(editorControls.resetAdjustColors).toHaveBeenCalledOnce();
    expect(editorControls.resetCrop).toHaveBeenCalledOnce();
    expect(editorControls.resetRemoveBackground).toHaveBeenCalledOnce();
  });

  it('keeps image, history, active editor, and controls when reset fails', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const rotatedImage = createImage();
    const croppedImage = createImage();
    const rotate: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const crop: EditImageCommand = {
      type: EditImageCommandType.Crop,
      rectangle: {x: 0, y: 0, width: 10, height: 10},
    };
    commandService.apply.mockResolvedValueOnce(rotatedImage).mockResolvedValueOnce(croppedImage);
    await store.getState().editImageOperation.execute(rotate);
    await store.getState().editImageOperation.execute(crop);
    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    clearEditorResetActions();
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('Reset failed'));

    await expect(store.getState().resetEditImage()).rejects.toThrow('Reset failed');

    expect(store.getState()).toMatchObject({
      editedImage: croppedImage,
      editImageHistory: [
        {command: rotate, replaceable: false},
        {command: crop, replaceable: false},
      ],
      undoneEditImageHistory: [],
      activeImageEditorKey: ImageEditorKey.Crop,
    });
    expect(editorControls.resetAdjustColors).not.toHaveBeenCalled();
    expect(editorControls.resetCrop).not.toHaveBeenCalled();
    expect(editorControls.resetRemoveBackground).not.toHaveBeenCalled();
    expect(croppedImage.close).not.toHaveBeenCalled();
  });

  it('clears the image and its history when the file is removed', async () => {
    const store = createEditImageStore();
    const {imageToEdit, editedImage} = await loadImage(store);
    const adjustedImage = createImage();
    commandService.apply.mockResolvedValueOnce(adjustedImage);
    await store.getState().editImageOperation.preview(adjustColorsCommand(120));
    clearEditorResetActions();

    await store.getState().setImageFileToEdit(null);

    expect(store.getState()).toMatchObject({
      imageFileToEdit: null,
      imageToEdit: null,
      imageBeforeLastEdit: null,
      editedImage: null,
      editImageHistory: [],
      undoneEditImageHistory: [],
      activeImageEditorKey: undefined,
    });
    expect(imageToEdit.close).toHaveBeenCalledOnce();
    expect(editedImage.close).toHaveBeenCalledOnce();
    expect(adjustedImage.close).toHaveBeenCalledOnce();
    expect(editorControls.resetAdjustColors).toHaveBeenCalledOnce();
    expect(editorControls.resetCrop).toHaveBeenCalledOnce();
    expect(editorControls.resetRemoveBackground).toHaveBeenCalledOnce();
  });

  it('clears history after successfully replacing the image', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const rotatedImage = createImage();
    commandService.apply.mockResolvedValueOnce(rotatedImage);
    await store.getState().editImageOperation.execute({type: EditImageCommandType.RotateClockwise});
    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    const replacementSource = createImage();
    const replacementEdited = createImage();
    vi.mocked(createImageBitmap)
      .mockResolvedValueOnce(replacementSource)
      .mockResolvedValueOnce(replacementEdited);

    await store.getState().setImageFileToEdit(new Blob() as File);

    expect(store.getState()).toMatchObject({
      imageToEdit: replacementSource,
      editedImage: replacementEdited,
      editImageHistory: [],
      undoneEditImageHistory: [],
      activeImageEditorKey: undefined,
    });
  });

  it('reuses the cached render to undo, replaying only the prefix it no longer has', async () => {
    const store = createEditImageStore();
    const {imageToEdit} = await loadImage(store);
    const rotatedImage = createImage();
    const firstAdjustedImage = createImage();
    const secondAdjustedImage = createImage();
    const replaySource = createImage();
    const replayedImage = createImage();
    const rotateCommand: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const firstAdjustCommand: EditImageCommand = adjustColorsCommand(80);
    const secondAdjustCommand: EditImageCommand = adjustColorsCommand(120);
    commandService.apply
      .mockResolvedValueOnce(rotatedImage)
      .mockResolvedValueOnce(firstAdjustedImage)
      .mockResolvedValueOnce(secondAdjustedImage);
    await store.getState().editImageOperation.execute(rotateCommand);
    await store.getState().editImageOperation.execute(firstAdjustCommand);
    await store.getState().editImageOperation.execute(secondAdjustCommand);
    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    const observedActiveImageEditorKeys: (ImageEditorKey | undefined)[] = [];
    const unsubscribe = store.subscribe(state => {
      observedActiveImageEditorKeys.push(state.activeImageEditorKey);
    });
    vi.mocked(createImageBitmap).mockClear();
    commandService.apply.mockClear();

    await store.getState().undoEditImage();

    // the kept render is reused as the result and no prefix is needed for a cumulative command
    expect(createImageBitmap).not.toHaveBeenCalled();
    expect(commandService.apply).not.toHaveBeenCalled();
    expect(store.getState().imageBeforeLastEdit).toBeNull();
    expect(secondAdjustedImage.close).toHaveBeenCalledOnce();
    expect(store.getState()).toMatchObject({
      editedImage: firstAdjustedImage,
      editImageHistory: [
        {command: rotateCommand, replaceable: false},
        {command: firstAdjustCommand, replaceable: false},
      ],
      undoneEditImageHistory: [{command: secondAdjustCommand, replaceable: false}],
      activeImageEditorKey: ImageEditorKey.AdjustColors,
    });

    vi.mocked(createImageBitmap).mockResolvedValueOnce(replaySource);
    commandService.apply.mockResolvedValueOnce(replayedImage);
    await store.getState().undoEditImage();
    unsubscribe();

    // only now is a render missing, so the prefix is replayed
    expect(createImageBitmap).toHaveBeenCalledExactlyOnceWith(imageToEdit);
    expect(commandService.apply).toHaveBeenCalledExactlyOnceWith(
      replaySource,
      rotateCommand,
      expect.any(AbortSignal)
    );
    expect(store.getState()).toMatchObject({
      editedImage: replayedImage,
      editImageHistory: [{command: rotateCommand, replaceable: false}],
      undoneEditImageHistory: [
        {command: secondAdjustCommand, replaceable: false},
        {command: firstAdjustCommand, replaceable: false},
      ],
    });
    expect(imageToEdit.close).not.toHaveBeenCalled();
    expect(observedActiveImageEditorKeys).not.toContain(undefined);
  });

  it('keeps committed state and history when replay fails', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const rotatedImage = createImage();
    const croppedImage = createImage();
    const rotateCommand: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const cropCommand: EditImageCommand = {
      type: EditImageCommandType.Crop,
      rectangle: {x: 0, y: 0, width: 10, height: 10},
    };
    commandService.apply.mockResolvedValueOnce(rotatedImage).mockResolvedValueOnce(croppedImage);
    await store.getState().editImageOperation.execute(rotateCommand);
    await store.getState().editImageOperation.execute(cropCommand);
    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    vi.mocked(createImageBitmap).mockRejectedValueOnce(new Error('Replay failed'));

    await expect(store.getState().resetEditImage()).rejects.toThrow('Replay failed');

    expect(store.getState()).toMatchObject({
      editedImage: croppedImage,
      editImageHistory: [
        {command: rotateCommand, replaceable: false},
        {command: cropCommand, replaceable: false},
      ],
      undoneEditImageHistory: [],
      activeImageEditorKey: ImageEditorKey.Crop,
    });
    expect(croppedImage.close).not.toHaveBeenCalled();
  });

  it('closes an aborted replay result and keeps committed state and history', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const rotatedImage = createImage();
    const croppedImage = createImage();
    const abortedReplayImage = createImage();
    const rotateCommand: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const cropCommand: EditImageCommand = {
      type: EditImageCommandType.Crop,
      rectangle: {x: 0, y: 0, width: 10, height: 10},
    };
    commandService.apply.mockResolvedValueOnce(rotatedImage).mockResolvedValueOnce(croppedImage);
    await store.getState().editImageOperation.execute(rotateCommand);
    await store.getState().editImageOperation.execute(cropCommand);
    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    let resolveReplay: (image: ImageBitmap) => void = () => undefined;
    vi.mocked(createImageBitmap).mockImplementationOnce(
      async () =>
        await new Promise<ImageBitmap>(resolve => {
          resolveReplay = resolve;
        })
    );

    const reset = store.getState().resetEditImage();
    store.getState().editImageOperation.abort();
    resolveReplay(abortedReplayImage);
    await reset;

    expect(abortedReplayImage.close).toHaveBeenCalledOnce();
    expect(croppedImage.close).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      editedImage: croppedImage,
      editImageHistory: [
        {command: rotateCommand, replaceable: false},
        {command: cropCommand, replaceable: false},
      ],
      undoneEditImageHistory: [],
      activeImageEditorKey: ImageEditorKey.Crop,
    });
  });

  it('closes a preview produced after its mode becomes inactive', async () => {
    const store = createEditImageStore();
    await loadImage(store);
    const stalePreviewImage = createImage();
    let resolvePreviewImage: (image: ImageBitmap) => void = () => undefined;
    commandService.apply.mockImplementationOnce(
      async () =>
        await new Promise<ImageBitmap>(resolve => {
          resolvePreviewImage = resolve;
        })
    );
    store.getState().setActiveImageEditorKey(ImageEditorKey.AdjustColors);
    const update = store.getState().editImageOperation.preview(adjustColorsCommand());

    store.getState().setActiveImageEditorKey(ImageEditorKey.Crop);
    resolvePreviewImage(stalePreviewImage);
    await update;

    expect(store.getState().editImageHistory).toEqual([]);
    expect(stalePreviewImage.close).toHaveBeenCalledOnce();
  });
});
