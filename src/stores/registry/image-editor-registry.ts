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

import type {EditImageCommand} from '@/services/image/edit-image-command';
import type {ImageEditorKey} from '@/tabs';

export interface ImageEditorControls {
  reset?: () => void;
  clear?: () => void;
  restore?: (command: EditImageCommand) => void;
}

export class ImageEditorRegistry {
  private readonly editors = new Map<ImageEditorKey, ImageEditorControls>();

  register(imageEditorKey: ImageEditorKey, controls: ImageEditorControls): void {
    this.editors.set(imageEditorKey, controls);
  }

  reset(imageEditorKey: ImageEditorKey | undefined): void {
    if (imageEditorKey) {
      this.editors.get(imageEditorKey)?.reset?.();
    }
  }

  resetAll(): void {
    for (const {reset, clear} of this.editors.values()) {
      reset?.();
      clear?.();
    }
  }

  restore(imageEditorKey: ImageEditorKey | undefined, command: EditImageCommand): void {
    if (imageEditorKey) {
      this.editors.get(imageEditorKey)?.restore?.(command);
    }
  }
}

export const imageEditorControls = new ImageEditorRegistry();
