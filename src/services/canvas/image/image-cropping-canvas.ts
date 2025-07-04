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

import type {ZoomableImageCanvasProps} from '~/src/services/canvas/image/zoomable-image-canvas';
import {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {clamp} from '~/src/services/math/clamp';
import {Rectangle, Vector} from '~/src/services/math/geometry';
import {type Margins} from '~/src/utils/graphics';

const LINE_WIDTH = 1.5;

enum HitBox {
  Top = 1,
  Bottom,
  Left,
  Right,
  TopLeft,
  TopRight,
  BottomLeft,
  BottomRight,
}

export interface ImageCroppingCanvasProps extends ZoomableImageCanvasProps {
  hitBoxSize?: number;
}

export class ImageCroppingCanvas extends ZoomableImageCanvas {
  private readonly hitBoxSize: number;
  private margins: Margins = {top: 0, bottom: 0, left: 0, right: 0};
  private hitBox?: HitBox | null = null;
  private lastMargins?: Margins | null = null;

  constructor(canvas: HTMLCanvasElement, props: ImageCroppingCanvasProps = {}) {
    super(canvas, props);

    ({hitBoxSize: this.hitBoxSize = 30} = props);
  }

  protected override onImagesLoaded(): void {
    this.resetMargins();
  }

  private drawRectangle(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const {width, height} = this.getImageDimension();
    const {top, bottom, left, right} = this.margins;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.moveTo(left, top);
    ctx.lineTo(left, height - bottom);
    ctx.lineTo(width - right, height - bottom);
    ctx.lineTo(width - right, top);
    ctx.closePath();
    ctx.fill('evenodd');

    const size = this.hitBoxSize / this.zoom;
    const diag = new Vector(size, size);
    const diagX = new Vector(size, 0);
    const diagY = new Vector(0, size);
    const topLeft = new Vector(left, top);
    const topRight = new Vector(width - right, top);
    const bottomLeft = new Vector(left, height - bottom);
    const bottomRight = new Vector(width - right, height - bottom);
    const rectangles: Rectangle[] = [
      new Rectangle(bottomRight, topLeft),
      new Rectangle(topLeft.add(diag), topLeft),
      new Rectangle(topRight.add(diagY), topRight.subtract(diagX)),
      new Rectangle(bottomLeft.add(diagX), bottomLeft.subtract(diagY)),
      new Rectangle(bottomRight, bottomRight.subtract(diag)),
    ];
    rectangles.forEach(({topLeft: {x, y}, width, height}) => {
      ctx.lineWidth = LINE_WIDTH / this.zoom;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.stroke();
    });
  }

  protected override onImageDrawn(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    const {center} = this.getImageDimension();
    ctx.save();
    ctx.translate(-center.x, -center.y);
    this.drawRectangle(ctx);
    ctx.restore();
  }

  getMargins(): Margins {
    return {...this.margins};
  }

  resetMargins(): void {
    this.margins = {top: 0, bottom: 0, left: 0, right: 0};
    this.requestRedraw();
  }

  protected override onDragStart(point: Vector): void {
    const {width, height} = this.getImageDimension();
    const {top, bottom, left, right} = this.margins;
    const topLeft = new Vector(left, top);
    const topRight = new Vector(width - right, top);
    const bottomLeft = new Vector(left, height - bottom);
    const bottomRight = new Vector(width - right, height - bottom);

    const size = this.hitBoxSize / this.zoom;
    const diag = new Vector(size, size);
    const diagFlip = new Vector(-size, size);
    const hitBoxes: [HitBox, Rectangle][] = [
      [HitBox.TopLeft, new Rectangle(topLeft.add(diag), topLeft.subtract(diag))],
      [HitBox.TopRight, new Rectangle(topRight.add(diag), topRight.subtract(diag))],
      [HitBox.BottomLeft, new Rectangle(bottomLeft.add(diag), bottomLeft.subtract(diag))],
      [HitBox.BottomRight, new Rectangle(bottomRight.add(diag), bottomRight.subtract(diag))],
      [HitBox.Top, new Rectangle(topRight.add(diagFlip), topLeft.subtract(diagFlip))],
      [HitBox.Bottom, new Rectangle(bottomRight.add(diagFlip), bottomLeft.subtract(diagFlip))],
      [HitBox.Left, new Rectangle(bottomLeft.subtract(diagFlip), topLeft.add(diagFlip))],
      [HitBox.Right, new Rectangle(bottomRight.subtract(diagFlip), topRight.add(diagFlip))],
    ];
    const imagePoint = this.toImagePoint(point);
    const [hitBox] = hitBoxes.find(([_, rect]) => rect.contains(imagePoint)) ?? [];
    this.hitBox = hitBox;
    this.lastMargins = {...this.margins};
  }

  protected override onDrag(point: Vector, dragStart: Vector): void {
    if (!this.hitBox || !this.lastMargins) {
      super.onDrag(point, dragStart);
      return;
    }
    const {width, height} = this.getImageDimension();
    const {top, bottom, left, right} = this.lastMargins;
    const {x, y} = point.subtract(dragStart).subtract(this.offset);
    const margins = this.margins;
    switch (this.hitBox) {
      case HitBox.TopLeft:
        margins.top = top + y;
        margins.left = left + x;
        break;
      case HitBox.TopRight:
        margins.top = top + y;
        margins.right = right - x;
        break;
      case HitBox.BottomLeft:
        margins.bottom = bottom - y;
        margins.left = left + x;
        break;
      case HitBox.BottomRight:
        margins.bottom = bottom - y;
        margins.right = right - x;
        break;
      case HitBox.Top:
        margins.top = top + y;
        break;
      case HitBox.Bottom:
        margins.bottom = bottom - y;
        break;
      case HitBox.Left:
        margins.left = left + x;
        break;
      case HitBox.Right:
        margins.right = right - x;
        break;
    }
    margins.top = clamp(margins.top, 0, height);
    margins.bottom = clamp(margins.bottom, 0, height);
    margins.left = clamp(margins.left, 0, width);
    margins.right = clamp(margins.right, 0, width);
  }

  protected override onDragEnd(): void {
    this.hitBox = null;
    this.lastMargins = null;
  }
}
