/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {invertColorsWebGL} from '~/src/services/image/filter/invert-colors-webgl';
import type {Vector} from '~/src/services/math/geometry';
import {IMAGE_SIZE} from '~/src/utils/graphics';

import type {ZoomableImageCanvasProps} from './zoomable-image-canvas';
import {ZoomableImageCanvas} from './zoomable-image-canvas';

export interface OverlayDrawingCanvasProps extends ZoomableImageCanvasProps {
  lineWidth?: number;
}

export abstract class OverlayDrawingCanvas extends ZoomableImageCanvas {
  protected lineWidth: number;
  private invertedImages: ImageBitmap[] = [];

  constructor(canvas: HTMLCanvasElement, props: OverlayDrawingCanvasProps = {}) {
    super(canvas, props);

    ({lineWidth: this.lineWidth = 1.5} = props);
  }

  protected override onImagesLoaded(): void {
    console.time('invert-colors');
    this.invertedImages = this.images.map((image: ImageBitmap): ImageBitmap => {
      return invertColorsWebGL(image);
    });
    console.timeEnd('invert-colors');
  }

  protected drawCircle(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    center: Vector,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  }

  protected drawLine(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    p1: Vector,
    p2: Vector
  ): void {
    ctx.lineWidth = this.lineWidth / this.zoom;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    const {x: x1, y: y1} = p1;
    ctx.moveTo(x1, y1);
    const {x: x2, y: y2} = p2;
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  protected abstract drawOverlay(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void;

  protected override onBeforeImageDrawn(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.drawOverlay(ctx);
    ctx.globalCompositeOperation = 'source-in';
    this.drawImage(ctx, this.invertedImages);
    ctx.globalCompositeOperation = 'destination-over';
  }

  protected override onImageDrawn(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.drawOverlay(ctx);
    ctx.globalCompositeOperation = 'source-over';
  }

  override convertToOffscreenCanvas(): OffscreenCanvas | null {
    const image: ImageBitmap | OffscreenCanvas | null = this.getImage();
    if (!image) {
      return null;
    }
    const {width, height} = image;
    const scaleFactor: number = Math.max(1, (width * height) / IMAGE_SIZE.HD);
    const {lineWidth} = this;
    try {
      this.lineWidth = scaleFactor * lineWidth;
      return super.convertToOffscreenCanvas();
    } finally {
      this.lineWidth = lineWidth;
    }
  }
}
