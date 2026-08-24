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

import type {Rectangle} from '@/services/math/geometry';
import type {DrawImageSource} from '@/utils/graphics';

import type {
  CanvasDrag,
  CanvasMode,
  CanvasModeContext,
  CanvasPointer,
  ImageCanvasRenderingContext,
} from './canvas-mode';

export class CompositeCanvasMode<K extends PropertyKey> implements CanvasMode {
  private context: CanvasModeContext | null = null;
  private activeModeKey: K | null;
  private imageRevision = 0;
  private readonly imageRevisions = new Map<CanvasMode, number>();

  constructor(
    private readonly modes: Readonly<Record<K, CanvasMode | null>>,
    activeModeKey: K | null = null
  ) {
    this.activeModeKey = activeModeKey;
  }

  protected get activeMode(): CanvasMode | null {
    return this.activeModeKey === null ? null : this.modes[this.activeModeKey];
  }

  private loadImagesIfNeeded(mode: CanvasMode): void {
    if (this.imageRevisions.get(mode) === this.imageRevision) {
      return;
    }
    mode.onImagesLoaded?.();
    this.imageRevisions.set(mode, this.imageRevision);
  }

  activate(context: CanvasModeContext): void {
    this.context = context;
    this.activeMode?.activate(context);
  }

  deactivate(): void {
    if (!this.context) {
      return;
    }
    this.activeMode?.deactivate();
    this.context = null;
  }

  setActiveMode(activeModeKey: K | null): void {
    if (activeModeKey === this.activeModeKey) {
      return;
    }
    if (this.context) {
      this.activeMode?.deactivate();
    }
    this.activeModeKey = activeModeKey;
    const mode = this.activeMode;
    if (mode && this.context) {
      mode.activate(this.context);
      this.loadImagesIfNeeded(mode);
    }
    this.context?.refreshCursor();
    this.context?.requestRedraw();
  }

  getActiveMode(): CanvasMode | null {
    return this.activeMode;
  }

  onImagesLoaded(): void {
    this.imageRevision++;
    const mode = this.activeMode;
    if (mode) {
      this.loadImagesIfNeeded(mode);
    }
  }

  getCursor(): string | undefined {
    return this.activeMode?.getCursor?.();
  }

  getImage(image: DrawImageSource | null): DrawImageSource | null {
    const mode = this.activeMode;
    return mode?.getImage ? mode.getImage(image) : image;
  }

  getImageDimension(dimension: Rectangle): Rectangle {
    return this.activeMode?.getImageDimension?.(dimension) ?? dimension;
  }

  onBeforeImageDrawn(ctx: ImageCanvasRenderingContext): void {
    this.activeMode?.onBeforeImageDrawn?.(ctx);
  }

  onImageDrawn(ctx: ImageCanvasRenderingContext): void {
    this.activeMode?.onImageDrawn?.(ctx);
  }

  startDrag(pointer: CanvasPointer): CanvasDrag | undefined {
    return this.activeMode?.startDrag?.(pointer);
  }

  onClickOrTap(pointer: CanvasPointer): boolean {
    return this.activeMode?.onClickOrTap?.(pointer) ?? false;
  }

  destroy(): void {
    this.deactivate();
    const modes: (CanvasMode | null)[] = Object.values(this.modes);
    modes.forEach(mode => {
      mode?.destroy();
    });
    this.imageRevisions.clear();
  }
}
