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

import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import {ImageEditorRegistry} from '@/stores/registry/image-editor-registry';
import {ImageEditorKey} from '@/tabs';

describe('ImageEditorRegistry', () => {
  it('resets only the given editor', () => {
    const resetCrop = vi.fn();
    const resetAdjustColors = vi.fn();
    const registry = new ImageEditorRegistry();
    registry.register(ImageEditorKey.Crop, {reset: resetCrop});
    registry.register(ImageEditorKey.AdjustColors, {reset: resetAdjustColors});

    registry.reset(ImageEditorKey.Crop);
    registry.reset(undefined);

    expect(resetCrop).toHaveBeenCalledOnce();
    expect(resetAdjustColors).not.toHaveBeenCalled();
  });

  it('clears state that survives an editor switch only when resetting every editor', () => {
    const reset = vi.fn();
    const clear = vi.fn();
    const registry = new ImageEditorRegistry();
    registry.register(ImageEditorKey.Crop, {reset, clear});

    registry.reset(ImageEditorKey.Crop);

    expect(clear).not.toHaveBeenCalled();

    registry.resetAll();

    expect(reset).toHaveBeenCalledTimes(2);
    expect(clear).toHaveBeenCalledOnce();
  });

  it('restores the controls of the given editor', () => {
    const command: EditImageCommand = {type: EditImageCommandType.RotateClockwise};
    const restore = vi.fn();
    const registry = new ImageEditorRegistry();
    registry.register(ImageEditorKey.Straighten, {restore});

    registry.restore(ImageEditorKey.Straighten, command);
    registry.restore(ImageEditorKey.Crop, command);

    expect(restore).toHaveBeenCalledExactlyOnceWith(command);
  });
});
