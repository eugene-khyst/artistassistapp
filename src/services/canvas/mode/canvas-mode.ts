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

import {Rectangle, type Vector} from '@/services/math/geometry';
import type {DrawImageSource} from '@/utils/graphics';

export type ImageCanvasRenderingContext =
  CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface CanvasPointer {
  canvasPoint: Vector;
  worldPoint: Vector;
  imageCenteredPoint: Vector;
  imagePoint: Vector;
}

export interface CanvasDrag {
  move: (pointer: CanvasPointer) => void;
  end: () => void;
  cancel: () => void;
}

export interface CanvasModeContext {
  getCanvas: () => HTMLCanvasElement;
  getImages: () => readonly DrawImageSource[];
  getImageIndex: () => number;
  getImageDimension: () => Rectangle;
  getZoom: () => number;
  isExporting: () => boolean;
  requestRedraw: () => void;
  refreshCursor: () => void;
}

export interface CanvasMode {
  activate: (context: CanvasModeContext) => void;
  deactivate: () => void;
  destroy: () => void;
  onImagesLoaded?: () => void;
  getCursor?: () => string | undefined;
  getImage?: (image: DrawImageSource | null) => DrawImageSource | null;
  getImageDimension?: (dimension: Rectangle) => Rectangle;
  onBeforeImageDrawn?: (ctx: ImageCanvasRenderingContext) => void;
  onImageDrawn?: (ctx: ImageCanvasRenderingContext) => void;
  startDrag?: (pointer: CanvasPointer) => CanvasDrag | undefined;
  onClickOrTap?: (pointer: CanvasPointer) => boolean;
}

export const NOOP_CANVAS_MODE_SUPPLIER = (): null => null;

export abstract class BaseCanvasMode implements CanvasMode {
  protected context: CanvasModeContext | null = null;

  protected imageDimension(): Rectangle {
    return this.context?.getImageDimension() ?? Rectangle.ZERO;
  }

  activate(context: CanvasModeContext): void {
    this.context = context;
  }

  deactivate(): void {
    this.context = null;
  }

  destroy(): void {
    this.deactivate();
  }
}
