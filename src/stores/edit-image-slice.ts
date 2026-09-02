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
import {applyEditImageCommand} from '@/services/image/edit-image';
import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import {createAbortableOperation} from '@/utils/abortable-operation';

export interface EditImageContext<T extends ImageBitmap | null = ImageBitmap | null> {
  image: T;
  signal: AbortSignal;
  setDownloadTip: (tip: string | null) => void;
}

export type EditImageCommandSupplier = (
  context: EditImageContext<ImageBitmap>
) => EditImageCommand | null | Promise<EditImageCommand | null>;

export interface EditImageOperation {
  run: <T>(task: (context: EditImageContext) => T | Promise<T>) => Promise<T | undefined>;
  preview: (commandOrSupplier: EditImageCommand | EditImageCommandSupplier) => Promise<boolean>;
  execute: (commandOrSupplier: EditImageCommand | EditImageCommandSupplier) => Promise<boolean>;
  abort: () => void;
}

export interface EditImageHistoryEntry {
  command: EditImageCommand;
  replaceable: boolean;
}

const EDITOR_KEY_BY_COMMAND_TYPE: Record<EditImageCommandType, ImageEditorKey> = {
  [EditImageCommandType.RotateClockwise]: ImageEditorKey.Straighten,
  [EditImageCommandType.Straighten]: ImageEditorKey.Straighten,
  [EditImageCommandType.Crop]: ImageEditorKey.Crop,
  [EditImageCommandType.Expand]: ImageEditorKey.Expand,
  [EditImageCommandType.AdjustColors]: ImageEditorKey.AdjustColors,
  [EditImageCommandType.RemoveBackground]: ImageEditorKey.RemoveBackground,
  [EditImageCommandType.RemoveObjects]: ImageEditorKey.RemoveObjects,
};

function imageEditorKey(command: EditImageCommand): ImageEditorKey {
  return EDITOR_KEY_BY_COMMAND_TYPE[command.type];
}

// A second edit from the same editor replaces the first one, because the two would add up.
function isSupersededBy(
  entry: EditImageHistoryEntry,
  next: EditImageHistoryEntry | undefined
): boolean {
  return (
    entry.replaceable &&
    !!next?.replaceable &&
    imageEditorKey(next.command) === imageEditorKey(entry.command)
  );
}

function appliedCommands(history: readonly EditImageHistoryEntry[]): EditImageCommand[] {
  return history
    .filter((entry, index) => !isSupersededBy(entry, history[index + 1]))
    .map(({command}) => command);
}

function sameCommands(a: readonly EditImageCommand[], b: readonly EditImageCommand[]): boolean {
  return a.length === b.length && a.every((command, index) => command === b[index]);
}

export interface EditImageSlice {
  imageFileToEdit: File | null;
  imageToEdit: ImageBitmap | null;
  imageBeforeLastEdit: ImageBitmap | null;
  editedImage: ImageBitmap | null;
  editImageHistory: readonly EditImageHistoryEntry[];
  undoneEditImageHistory: readonly EditImageHistoryEntry[];
  isEditedImageLoading: boolean;
  editImageDownloadTip: string | null;
  activeImageEditorKey?: ImageEditorKey;
  editImageOperation: EditImageOperation;

  setActiveImageEditorKey: (imageEditorKey: ImageEditorKey | undefined) => void;
  setImageFileToEdit: (imageFileToEdit: File | null) => Promise<void>;
  undoEditImage: () => Promise<void>;
  redoEditImage: () => Promise<void>;
  resetEditImage: () => Promise<void>;
}

interface RenderedHistory {
  editedImage: ImageBitmap;
  imageBeforeLastEdit: ImageBitmap | null;
  owned: readonly ImageBitmap[];
}

interface AppliedEditImageHistory {
  editImageHistory: readonly EditImageHistoryEntry[];
  undoneEditImageHistory: readonly EditImageHistoryEntry[];
  rendered: RenderedHistory;
}

export const createEditImageSlice: StateCreator<EditImageSlice, [], [], EditImageSlice> = (
  set,
  get
) => {
  // Reset only after the history changed, so a canceled edit does not clear what the user just set.
  const showAppliedImageEditorControls = (reset = false): void => {
    const {activeImageEditorKey, editImageHistory} = get();
    const {command} = editImageHistory.at(-1) ?? {};
    if (command && imageEditorKey(command) === activeImageEditorKey) {
      imageEditorControls.restore(activeImageEditorKey, command);
    } else if (reset) {
      imageEditorControls.reset(activeImageEditorKey);
    }
  };

  const activateImageEditor = (activeImageEditorKey: ImageEditorKey | undefined): void => {
    const {activeImageEditorKey: prevActiveImageEditorKey} = get();
    if (prevActiveImageEditorKey !== activeImageEditorKey) {
      imageEditorControls.reset(prevActiveImageEditorKey);
      set({
        activeImageEditorKey,
      });
    }
  };

  const abortableOperation = createAbortableOperation({
    onStart: () => {
      set({
        isEditedImageLoading: true,
        editImageDownloadTip: null,
      });
    },
    onFinish: () => {
      set({
        isEditedImageLoading: false,
        editImageDownloadTip: null,
      });
    },
  });

  const createEditImageContext = <T extends ImageBitmap | null>(
    signal: AbortSignal,
    image: T
  ): EditImageContext<T> => ({
    image,
    signal,
    setDownloadTip: (editImageDownloadTip: string | null): void => {
      if (!signal.aborted) {
        set({
          editImageDownloadTip,
        });
      }
    },
  });

  const replayCommands = async (
    imageToEdit: ImageBitmap,
    commands: readonly EditImageCommand[],
    signal: AbortSignal
  ): Promise<ImageBitmap> => {
    let image = await createImageBitmap(imageToEdit);
    try {
      for (const command of commands) {
        signal.throwIfAborted();
        const replayed = await applyEditImageCommand(image, command, signal);
        image.close();
        image = replayed;
      }
      signal.throwIfAborted();
      return image;
    } catch (error) {
      image.close();
      throw error;
    }
  };

  const renderedImage = (commands: readonly EditImageCommand[]): ImageBitmap | null => {
    const {imageBeforeLastEdit, editedImage, editImageHistory} = get();
    const rendered = appliedCommands(editImageHistory);
    if (editedImage && sameCommands(commands, rendered)) {
      return editedImage;
    }
    return imageBeforeLastEdit && sameCommands(commands, rendered.slice(0, -1))
      ? imageBeforeLastEdit
      : null;
  };

  const renderHistory = async (
    imageToEdit: ImageBitmap,
    history: readonly EditImageHistoryEntry[],
    signal: AbortSignal
  ): Promise<RenderedHistory> => {
    const commands = appliedCommands(history);
    const commandsBeforeLastEdit = commands.slice(0, -1);
    const alreadyRendered = renderedImage(commands);
    if (alreadyRendered) {
      const cached = commands.length ? renderedImage(commandsBeforeLastEdit) : null;
      // Only a replaceable last edit starts from the prefix, so only then is it worth rendering.
      if (cached || !history.at(-1)?.replaceable) {
        return {editedImage: alreadyRendered, imageBeforeLastEdit: cached, owned: []};
      }
      const replayed = await replayCommands(imageToEdit, commandsBeforeLastEdit, signal);
      return {editedImage: alreadyRendered, imageBeforeLastEdit: replayed, owned: [replayed]};
    }
    const lastCommand = commands.at(-1);
    if (!lastCommand) {
      const replayed = await replayCommands(imageToEdit, commands, signal);
      return {editedImage: replayed, imageBeforeLastEdit: null, owned: [replayed]};
    }
    const cached = renderedImage(commandsBeforeLastEdit);
    const imageBeforeLastEdit =
      cached ?? (await replayCommands(imageToEdit, commandsBeforeLastEdit, signal));
    try {
      const editedImage = await applyEditImageCommand(imageBeforeLastEdit, lastCommand, signal);
      return {
        editedImage,
        imageBeforeLastEdit,
        owned: cached ? [editedImage] : [imageBeforeLastEdit, editedImage],
      };
    } catch (error) {
      if (!cached) {
        imageBeforeLastEdit.close();
      }
      throw error;
    }
  };

  const commitEditImageHistory = ({
    editImageHistory,
    undoneEditImageHistory,
    rendered,
  }: AppliedEditImageHistory): void => {
    const {imageBeforeLastEdit: prevImageBeforeLastEdit, editedImage: prevEditedImage} = get();
    set({
      imageBeforeLastEdit: rendered.imageBeforeLastEdit,
      editedImage: rendered.editedImage,
      editImageHistory,
      undoneEditImageHistory,
    });
    for (const image of [prevImageBeforeLastEdit, prevEditedImage]) {
      if (image && image !== rendered.imageBeforeLastEdit && image !== rendered.editedImage) {
        image.close();
      }
    }
  };

  const runEditImageHistory = async (
    task: (signal: AbortSignal) => Promise<AppliedEditImageHistory | null>
  ): Promise<boolean> => {
    const applied = await abortableOperation.runAndCommit(
      task,
      result => {
        if (!result) {
          return false;
        }
        commitEditImageHistory(result);
        return true;
      },
      result => {
        result?.rendered.owned.forEach(image => {
          image.close();
        });
      }
    );
    return applied ?? false;
  };

  const applyEditImageHistory = async (
    editImageHistory: readonly EditImageHistoryEntry[],
    undoneEditImageHistory: readonly EditImageHistoryEntry[]
  ): Promise<boolean> => {
    const {imageToEdit} = get();
    if (!imageToEdit) {
      return false;
    }
    return await runEditImageHistory(async signal => ({
      editImageHistory,
      undoneEditImageHistory,
      rendered: await renderHistory(imageToEdit, editImageHistory, signal),
    }));
  };

  // An edit that replaces the last one starts from the image before it, not from its result.
  const commandSourceImage = (replaceable: boolean): ImageBitmap | null => {
    const {editImageHistory, imageBeforeLastEdit, editedImage, activeImageEditorKey} = get();
    const last = editImageHistory.at(-1);
    return replaceable && last?.replaceable && imageEditorKey(last.command) === activeImageEditorKey
      ? imageBeforeLastEdit
      : editedImage;
  };

  const addEditImageCommand = async (
    commandOrSupplier: EditImageCommand | EditImageCommandSupplier,
    replaceable: boolean
  ): Promise<boolean> => {
    try {
      return await runEditImageHistory(async signal => {
        const {imageToEdit} = get();
        const sourceImage = commandSourceImage(replaceable);
        if (!imageToEdit || !sourceImage) {
          return null;
        }
        const command =
          typeof commandOrSupplier === 'function'
            ? await commandOrSupplier(createEditImageContext(signal, sourceImage))
            : commandOrSupplier;
        if (!command) {
          return null;
        }
        signal.throwIfAborted();
        const editImageHistory = [...get().editImageHistory, {command, replaceable}];
        return {
          editImageHistory,
          undoneEditImageHistory: [],
          rendered: await renderHistory(imageToEdit, editImageHistory, signal),
        };
      });
    } catch (error) {
      showAppliedImageEditorControls();
      throw error;
    }
  };

  const editImageOperation: EditImageOperation = {
    run: async <T>(task: (context: EditImageContext) => T | Promise<T>): Promise<T | undefined> =>
      await abortableOperation.run(
        async signal => await task(createEditImageContext(signal, get().editedImage))
      ),

    preview: async (
      commandOrSupplier: EditImageCommand | EditImageCommandSupplier
    ): Promise<boolean> => await addEditImageCommand(commandOrSupplier, true),

    execute: async (
      commandOrSupplier: EditImageCommand | EditImageCommandSupplier
    ): Promise<boolean> => await addEditImageCommand(commandOrSupplier, false),

    abort: (): void => {
      const wasLoading = get().isEditedImageLoading;
      abortableOperation.abort();
      if (wasLoading) {
        showAppliedImageEditorControls();
      }
    },
  };

  return {
    imageFileToEdit: null,
    imageToEdit: null,
    imageBeforeLastEdit: null,
    editedImage: null,
    editImageHistory: [],
    undoneEditImageHistory: [],
    isEditedImageLoading: false,
    editImageDownloadTip: null,
    activeImageEditorKey: undefined,
    editImageOperation,

    setActiveImageEditorKey: (activeImageEditorKey: ImageEditorKey | undefined): void => {
      if (get().activeImageEditorKey === activeImageEditorKey) {
        return;
      }
      abortableOperation.abort();
      activateImageEditor(activeImageEditorKey);
      showAppliedImageEditorControls(true);
    },

    setImageFileToEdit: async (imageFileToEdit: File | null): Promise<void> => {
      await abortableOperation.runAndCommit(
        async signal => {
          let imageToEdit: ImageBitmap | null = null;
          let editedImage: ImageBitmap | null = null;
          try {
            if (imageFileToEdit) {
              imageToEdit = await createImageBitmap(imageFileToEdit);
              signal.throwIfAborted();
              editedImage = await createImageBitmap(imageToEdit);
            }
            return {imageToEdit, editedImage};
          } catch (error) {
            imageToEdit?.close();
            editedImage?.close();
            throw error;
          }
        },
        ({imageToEdit, editedImage}) => {
          const {
            imageToEdit: prevImageToEdit,
            imageBeforeLastEdit: prevImageBeforeLastEdit,
            editedImage: prevEditedImage,
          } = get();
          set({
            imageFileToEdit,
            imageToEdit,
            imageBeforeLastEdit: null,
            editedImage,
            editImageHistory: [],
            undoneEditImageHistory: [],
            editImageDownloadTip: null,
            activeImageEditorKey: undefined,
          });
          imageEditorControls.resetAll();
          prevImageToEdit?.close();
          prevEditedImage?.close();
          prevImageBeforeLastEdit?.close();
        },
        ({imageToEdit, editedImage}) => {
          imageToEdit?.close();
          editedImage?.close();
        }
      );
    },

    undoEditImage: async (): Promise<void> => {
      const {editImageHistory, undoneEditImageHistory} = get();
      const undone = editImageHistory.at(-1);
      if (!undone) {
        return;
      }
      const applied = await applyEditImageHistory(editImageHistory.slice(0, -1), [
        ...undoneEditImageHistory,
        undone,
      ]);
      if (applied) {
        activateImageEditor(imageEditorKey(undone.command));
        showAppliedImageEditorControls(true);
      }
    },

    redoEditImage: async (): Promise<void> => {
      const {editImageHistory, undoneEditImageHistory} = get();
      const redone = undoneEditImageHistory.at(-1);
      if (!redone) {
        return;
      }
      const applied = await applyEditImageHistory(
        [...editImageHistory, redone],
        undoneEditImageHistory.slice(0, -1)
      );
      if (applied) {
        activateImageEditor(imageEditorKey(redone.command));
        showAppliedImageEditorControls(true);
      }
    },

    resetEditImage: async (): Promise<void> => {
      if (await applyEditImageHistory([], [])) {
        set({
          activeImageEditorKey: undefined,
        });
        imageEditorControls.resetAll();
      }
    },
  };
};
