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

import {invertColorsWebGL} from '@/services/image/filter/invert-colors-webgl';
import type {Vector} from '@/services/math/geometry';
import {IMAGE_SIZE, toOffscreenCanvas} from '@/utils/graphics';

import {BaseCanvasMode, type ImageCanvasRenderingContext} from './canvas-mode';

export interface CanvasOverlayDrawingModeProps {
  lineWidth?: number;
}

export abstract class CanvasOverlayDrawingMode extends BaseCanvasMode {
  protected readonly lineWidth: number;
  private readonly invertedImages = new Map<number, OffscreenCanvas>();

  constructor({lineWidth = 1.5}: CanvasOverlayDrawingModeProps = {}) {
    super();
    this.lineWidth = lineWidth;
  }

  onImagesLoaded(): void {
    this.invertedImages.clear();
  }

  /**
   * Only the image being drawn is inverted, and only the first time it is. Inverting all of them
   * costs a WebGL context, a shader compile and a full-size copy each, and the editor passes three.
   */
  private invertedImage(index: number): OffscreenCanvas | undefined {
    const cached = this.invertedImages.get(index);
    if (cached) {
      return cached;
    }
    const image = this.context?.getImages()[index];
    if (!image) {
      return undefined;
    }
    // Only thin overlay strokes are tinted with this, so HD is indistinguishable from full size.
    const inverted = invertColorsWebGL(toOffscreenCanvas(image), IMAGE_SIZE.HD);
    this.invertedImages.set(index, inverted);
    return inverted;
  }

  protected drawCircle(ctx: ImageCanvasRenderingContext, center: Vector, radius: number): void {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  }

  protected getLineWidth(): number {
    if (!this.context?.isExporting()) {
      return this.lineWidth;
    }
    const {width, height} = this.context.getImageDimension();
    return this.lineWidth * Math.max(1, (width * height) / IMAGE_SIZE.HD);
  }

  protected drawLine(ctx: ImageCanvasRenderingContext, p1: Vector, p2: Vector): void {
    const zoom = this.context?.getZoom() ?? 1;
    ctx.lineWidth = this.getLineWidth() / zoom;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  protected abstract drawOverlay(ctx: ImageCanvasRenderingContext): void;

  protected drawOverImage(_ctx: ImageCanvasRenderingContext): void {
    // noop
  }

  onBeforeImageDrawn(ctx: ImageCanvasRenderingContext): void {
    this.drawOverlay(ctx);
    ctx.globalCompositeOperation = 'source-in';
    const invertedImage = this.invertedImage(this.context?.getImageIndex() ?? 0);
    if (invertedImage) {
      const {width, height, center} = this.imageDimension();
      ctx.drawImage(invertedImage, -center.x, -center.y, width, height);
    }
    ctx.globalCompositeOperation = 'destination-over';
  }

  onImageDrawn(ctx: ImageCanvasRenderingContext): void {
    this.drawOverlay(ctx);
    ctx.globalCompositeOperation = 'source-over';
    this.drawOverImage(ctx);
  }

  override destroy(): void {
    this.invertedImages.clear();
    super.destroy();
  }
}
