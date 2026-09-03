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

import type {CanvasMode} from './canvas-mode';
import {CompositeCanvasMode} from './composite-canvas-mode';

export enum ImageEditorModeType {
  Quadrilateral = 'quadrilateral',
  Crop = 'crop',
  Expand = 'expand',
  ColorPicker = 'color-picker',
  RemoveBackground = 'remove-background',
  Polygon = 'polygon',
  Upscale = 'upscale',
}

type ImageEditorModes = Readonly<Record<ImageEditorModeType, CanvasMode | null>>;

export class ImageEditorMode<
  T extends ImageEditorModes = ImageEditorModes,
> extends CompositeCanvasMode<ImageEditorModeType> {
  constructor(
    readonly delegates: T,
    activeModeKey: ImageEditorModeType | null = null
  ) {
    super(delegates, activeModeKey);
  }

  setMode(mode: ImageEditorModeType | null): void {
    this.setActiveMode(mode);
  }
}
