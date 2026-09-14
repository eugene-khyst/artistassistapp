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

import {describe, expect, it, vi} from 'vitest';
import {createStore} from 'zustand/vanilla';

import {ImageEditorKey} from '@/image-editor';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import type {EditImageOperation, EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';
import {createRotateSlice, type RotateSlice} from '@/stores/rotate-slice';

function createTestStore() {
  const execute = vi.fn().mockResolvedValue(true);
  const preview = vi.fn().mockResolvedValue(true);
  const editImageOperation = {execute, preview} as unknown as EditImageOperation;
  const store = createStore<RotateSlice & Pick<EditImageSlice, 'editImageOperation'>>()(
    (...args) => ({
      editImageOperation,
      ...createRotateSlice(...args),
    })
  );
  return {store, execute, preview};
}

describe('rotate slice', () => {
  it('previews Rotate as a replaceable command with the slider angle', async () => {
    const {store, preview} = createTestStore();
    store.getState().setRotationAngle(-12.5);

    await store.getState().rotateImage();

    expect(preview).toHaveBeenCalledExactlyOnceWith({
      type: EditImageCommandType.Rotate,
      angle: -12.5,
    });
  });

  it('resets the angle before a cumulative clockwise rotation', async () => {
    const {store, execute} = createTestStore();
    store.getState().setRotationAngle(10);

    await store.getState().rotateImageClockwise();

    expect(store.getState().rotationAngle).toBe(0);
    expect(execute).toHaveBeenCalledExactlyOnceWith({type: EditImageCommandType.RotateClockwise});
  });

  it('restores the angle of the applied command and resets it otherwise', () => {
    const {store} = createTestStore();

    imageEditorControls.restore(ImageEditorKey.Rotate, {
      type: EditImageCommandType.Rotate,
      angle: 7.5,
    });
    expect(store.getState().rotationAngle).toBe(7.5);

    imageEditorControls.restore(ImageEditorKey.Rotate, {
      type: EditImageCommandType.RotateClockwise,
    });
    expect(store.getState().rotationAngle).toBe(0);

    store.getState().setRotationAngle(20);
    imageEditorControls.reset(ImageEditorKey.Rotate);
    expect(store.getState().rotationAngle).toBe(0);
  });
});
