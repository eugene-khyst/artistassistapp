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

import {clamp, type Fraction} from '@eugene-khyst/artistassistapp-color-mixer';

import {Rectangle, Vector} from '@/services/math/geometry';

import {
  BaseCanvasMode,
  type CanvasDrag,
  type CanvasPointer,
  type ImageCanvasRenderingContext,
} from './canvas-mode';

const LINE_WIDTH = 1.5;

enum CropHandle {
  Top = 1,
  Bottom,
  Left,
  Right,
  TopLeft,
  TopRight,
  BottomLeft,
  BottomRight,
  Center,
}

export const ORIGINAL_CROP_ASPECT_RATIO = 'original';

export type CropAspectRatio = Fraction | typeof ORIGINAL_CROP_ASPECT_RATIO | null;

export interface ImageCroppingModeProps {
  hitBoxSize?: number;
  onCropChange?: (cropRectangle: Rectangle) => void;
}

export class ImageCroppingMode extends BaseCanvasMode {
  private readonly hitBoxSize: number;
  private readonly onCropChange?: (cropRectangle: Rectangle) => void;
  private cropRectangle = Rectangle.ZERO;
  private aspectRatio: CropAspectRatio = null;

  constructor({hitBoxSize = 30, onCropChange}: ImageCroppingModeProps = {}) {
    super();
    this.hitBoxSize = hitBoxSize;
    this.onCropChange = onCropChange;
  }

  onImagesLoaded(): void {
    this.resetCropRectangle();
  }

  private drawRectangle(ctx: ImageCanvasRenderingContext): void {
    const {width, height} = this.imageDimension();
    const {topLeft, bottomRight, center} = this.cropRectangle;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topLeft.x, bottomRight.y);
    ctx.lineTo(bottomRight.x, bottomRight.y);
    ctx.lineTo(bottomRight.x, topLeft.y);
    ctx.closePath();
    ctx.fill('evenodd');

    const zoom = this.context?.getZoom() ?? 1;
    const size = this.hitBoxSize / zoom;
    const halfSize = size / 2;
    const diagonal = new Vector(size, size);
    const diagonalX = new Vector(size, 0);
    const diagonalY = new Vector(0, size);
    const topRight = new Vector(bottomRight.x, topLeft.y);
    const bottomLeft = new Vector(topLeft.x, bottomRight.y);
    const rectangles = [
      this.cropRectangle,
      new Rectangle(topLeft.add(diagonal), topLeft),
      new Rectangle(topRight.add(diagonalY), topRight.subtract(diagonalX)),
      new Rectangle(bottomLeft.add(diagonalX), bottomLeft.subtract(diagonalY)),
      new Rectangle(bottomRight, bottomRight.subtract(diagonal)),
    ];
    rectangles.forEach(({topLeft: {x, y}, width, height}) => {
      ctx.lineWidth = LINE_WIDTH / zoom;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.rect(x, y, width, height);
      ctx.stroke();
    });

    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(Math.PI / 4);
    ctx.arc(0, 0, halfSize, 0, 2 * Math.PI);
    ctx.rect(-halfSize, -halfSize, size, size);
    ctx.restore();
    ctx.stroke();
  }

  onImageDrawn(ctx: ImageCanvasRenderingContext): void {
    const {center} = this.imageDimension();
    ctx.save();
    ctx.translate(-center.x, -center.y);
    this.drawRectangle(ctx);
    ctx.restore();
  }

  getCropRectangle(): Rectangle {
    const {topLeft, width, height} = this.cropRectangle;
    return Rectangle.fromTopLeft(new Vector(topLeft.x, topLeft.y), width, height);
  }

  getAspectRatio(): CropAspectRatio {
    return this.aspectRatio;
  }

  setAspectRatio(aspectRatio: CropAspectRatio): void {
    this.aspectRatio = aspectRatio;
    const ratio = this.getEffectiveAspectRatio();
    if (ratio) {
      this.cropRectangle = this.fitAspectRatio(this.cropRectangle, ratio);
    }
    this.notifyCropChange();
    this.context?.requestRedraw();
  }

  private notifyCropChange(): void {
    this.onCropChange?.(this.getCropRectangle());
  }

  setCropRectangle(cropRectangle: Rectangle | null): void {
    if (!cropRectangle) {
      this.resetCropRectangle();
      return;
    }
    this.cropRectangle = cropRectangle;
    this.notifyCropChange();
    this.context?.requestRedraw();
  }

  private resetCropRectangle(): void {
    const {width, height} = this.imageDimension();
    this.cropRectangle = Rectangle.fromTopLeft(Vector.ZERO, width, height);
    const ratio = this.getEffectiveAspectRatio();
    if (ratio) {
      this.cropRectangle = this.fitAspectRatio(this.cropRectangle, ratio);
    }
    this.notifyCropChange();
    this.context?.requestRedraw();
  }

  private getEffectiveAspectRatio(): number | null {
    if (!this.aspectRatio) {
      return null;
    }
    const {width, height} = this.imageDimension();
    const [ratioWidth, ratioHeight] =
      this.aspectRatio === ORIGINAL_CROP_ASPECT_RATIO ? [width, height] : this.aspectRatio;
    return ratioWidth > 0 && ratioHeight > 0 ? ratioWidth / ratioHeight : null;
  }

  private fitAspectRatio(rectangle: Rectangle, ratio: number): Rectangle {
    const imageDimension = this.imageDimension();
    if (!imageDimension.width || !imageDimension.height || !rectangle.width || !rectangle.height) {
      return rectangle;
    }

    const area = rectangle.width * rectangle.height;
    let width = Math.sqrt(area * ratio);
    let height = width / ratio;
    const scale = Math.min(1, imageDimension.width / width, imageDimension.height / height);
    width *= scale;
    height *= scale;
    const x = clamp(rectangle.center.x - width / 2, 0, imageDimension.width - width);
    const y = clamp(rectangle.center.y - height / 2, 0, imageDimension.height - height);
    return Rectangle.fromTopLeft(new Vector(x, y), width, height);
  }

  private findHandle(imagePoint: Vector): CropHandle | undefined {
    const {topLeft, bottomRight, center} = this.cropRectangle;
    const topRight = new Vector(bottomRight.x, topLeft.y);
    const bottomLeft = new Vector(topLeft.x, bottomRight.y);
    const size = this.hitBoxSize / (this.context?.getZoom() ?? 1);
    const diagonal = new Vector(size, size);
    const diagonalFlip = new Vector(-size, size);
    const hitBoxes: [CropHandle, Rectangle][] = [
      [CropHandle.TopLeft, new Rectangle(topLeft.add(diagonal), topLeft.subtract(diagonal))],
      [CropHandle.TopRight, new Rectangle(topRight.add(diagonal), topRight.subtract(diagonal))],
      [
        CropHandle.BottomLeft,
        new Rectangle(bottomLeft.add(diagonal), bottomLeft.subtract(diagonal)),
      ],
      [
        CropHandle.BottomRight,
        new Rectangle(bottomRight.add(diagonal), bottomRight.subtract(diagonal)),
      ],
      [CropHandle.Top, new Rectangle(topRight.add(diagonalFlip), topLeft.subtract(diagonalFlip))],
      [
        CropHandle.Bottom,
        new Rectangle(bottomRight.add(diagonalFlip), bottomLeft.subtract(diagonalFlip)),
      ],
      [
        CropHandle.Left,
        new Rectangle(bottomLeft.subtract(diagonalFlip), topLeft.add(diagonalFlip)),
      ],
      [
        CropHandle.Right,
        new Rectangle(bottomRight.subtract(diagonalFlip), topRight.add(diagonalFlip)),
      ],
    ];
    const resizeHandle = hitBoxes.find(([, rectangle]) => rectangle.contains(imagePoint))?.[0];
    if (resizeHandle) {
      return resizeHandle;
    }
    return imagePoint.subtract(center).length() <= size ? CropHandle.Center : undefined;
  }

  startDrag(start: CanvasPointer): CanvasDrag | undefined {
    const handle = this.findHandle(start.imagePoint);
    if (!handle) {
      return;
    }
    const initialRectangle = this.cropRectangle;
    const handleOffset =
      handle === CropHandle.Center
        ? Vector.ZERO
        : start.imagePoint.subtract(this.handlePoint(handle, initialRectangle));
    return {
      move: pointer => {
        if (handle === CropHandle.Center) {
          this.moveRectangle(pointer.imagePoint.subtract(start.imagePoint), initialRectangle);
        } else {
          this.resize(handle, pointer.imagePoint.subtract(handleOffset), initialRectangle);
        }
        this.context?.requestRedraw();
      },
      end: () => {
        this.notifyCropChange();
      },
      cancel: () => {
        this.cropRectangle = initialRectangle;
        this.context?.requestRedraw();
      },
    };
  }

  private moveRectangle({x, y}: Vector, initialRectangle: Rectangle): void {
    const imageDimension = this.imageDimension();
    const left = clamp(
      initialRectangle.topLeft.x + x,
      0,
      Math.max(0, imageDimension.width - initialRectangle.width)
    );
    const top = clamp(
      initialRectangle.topLeft.y + y,
      0,
      Math.max(0, imageDimension.height - initialRectangle.height)
    );
    this.cropRectangle = Rectangle.fromTopLeft(
      new Vector(left, top),
      initialRectangle.width,
      initialRectangle.height
    );
  }

  private resize(
    handle: Exclude<CropHandle, CropHandle.Center>,
    imagePoint: Vector,
    initialRectangle: Rectangle
  ): void {
    const ratio = this.getEffectiveAspectRatio();
    if (ratio) {
      this.resizeWithAspectRatio(handle, imagePoint, initialRectangle, ratio);
      return;
    }
    this.resizeFreely(handle, imagePoint, initialRectangle);
  }

  private resizeFreely(
    handle: Exclude<CropHandle, CropHandle.Center>,
    imagePoint: Vector,
    initialRectangle: Rectangle
  ): void {
    const imageDimension = this.imageDimension();
    const delta = imagePoint.subtract(this.handlePoint(handle, initialRectangle));
    const minimumWidth = Math.min(
      this.hitBoxSize / (this.context?.getZoom() ?? 1),
      initialRectangle.width
    );
    const minimumHeight = Math.min(
      this.hitBoxSize / (this.context?.getZoom() ?? 1),
      initialRectangle.height
    );
    let left = initialRectangle.topLeft.x;
    let top = initialRectangle.topLeft.y;
    let right = initialRectangle.bottomRight.x;
    let bottom = initialRectangle.bottomRight.y;

    switch (handle) {
      case CropHandle.TopLeft:
        top = clamp(top + delta.y, 0, bottom - minimumHeight);
        left = clamp(left + delta.x, 0, right - minimumWidth);
        break;
      case CropHandle.TopRight:
        top = clamp(top + delta.y, 0, bottom - minimumHeight);
        right = clamp(right + delta.x, left + minimumWidth, imageDimension.width);
        break;
      case CropHandle.BottomLeft:
        bottom = clamp(bottom + delta.y, top + minimumHeight, imageDimension.height);
        left = clamp(left + delta.x, 0, right - minimumWidth);
        break;
      case CropHandle.BottomRight:
        bottom = clamp(bottom + delta.y, top + minimumHeight, imageDimension.height);
        right = clamp(right + delta.x, left + minimumWidth, imageDimension.width);
        break;
      case CropHandle.Top:
        top = clamp(top + delta.y, 0, bottom - minimumHeight);
        break;
      case CropHandle.Bottom:
        bottom = clamp(bottom + delta.y, top + minimumHeight, imageDimension.height);
        break;
      case CropHandle.Left:
        left = clamp(left + delta.x, 0, right - minimumWidth);
        break;
      case CropHandle.Right:
        right = clamp(right + delta.x, left + minimumWidth, imageDimension.width);
        break;
    }
    this.cropRectangle = new Rectangle(new Vector(right, bottom), new Vector(left, top));
  }

  private handlePoint(
    handle: Exclude<CropHandle, CropHandle.Center>,
    rectangle: Rectangle
  ): Vector {
    const {topLeft, bottomRight, center} = rectangle;
    switch (handle) {
      case CropHandle.TopLeft:
        return topLeft;
      case CropHandle.TopRight:
        return new Vector(bottomRight.x, topLeft.y);
      case CropHandle.BottomLeft:
        return new Vector(topLeft.x, bottomRight.y);
      case CropHandle.BottomRight:
        return bottomRight;
      case CropHandle.Top:
        return new Vector(center.x, topLeft.y);
      case CropHandle.Bottom:
        return new Vector(center.x, bottomRight.y);
      case CropHandle.Left:
        return new Vector(topLeft.x, center.y);
      case CropHandle.Right:
        return new Vector(bottomRight.x, center.y);
    }
  }

  private resizeWithAspectRatio(
    handle: Exclude<CropHandle, CropHandle.Center>,
    imagePoint: Vector,
    initialRectangle: Rectangle,
    ratio: number
  ): void {
    switch (handle) {
      case CropHandle.TopLeft:
        this.resizeCorner(imagePoint, initialRectangle.bottomRight, -1, -1, ratio);
        break;
      case CropHandle.TopRight:
        this.resizeCorner(
          imagePoint,
          new Vector(initialRectangle.topLeft.x, initialRectangle.bottomRight.y),
          1,
          -1,
          ratio
        );
        break;
      case CropHandle.BottomLeft:
        this.resizeCorner(
          imagePoint,
          new Vector(initialRectangle.bottomRight.x, initialRectangle.topLeft.y),
          -1,
          1,
          ratio
        );
        break;
      case CropHandle.BottomRight:
        this.resizeCorner(imagePoint, initialRectangle.topLeft, 1, 1, ratio);
        break;
      case CropHandle.Left:
        this.resizeHorizontalEdge(imagePoint, initialRectangle, -1, ratio);
        break;
      case CropHandle.Right:
        this.resizeHorizontalEdge(imagePoint, initialRectangle, 1, ratio);
        break;
      case CropHandle.Top:
        this.resizeVerticalEdge(imagePoint, initialRectangle, -1, ratio);
        break;
      case CropHandle.Bottom:
        this.resizeVerticalEdge(imagePoint, initialRectangle, 1, ratio);
        break;
    }
  }

  private resizeCorner(
    imagePoint: Vector,
    anchor: Vector,
    horizontalDirection: -1 | 1,
    verticalDirection: -1 | 1,
    ratio: number
  ): void {
    const imageDimension = this.imageDimension();
    let width = Math.max(0, horizontalDirection * (imagePoint.x - anchor.x));
    const height = Math.max(0, verticalDirection * (imagePoint.y - anchor.y));
    if (width / ratio <= height) {
      width = height * ratio;
    }

    const horizontalLimit = horizontalDirection > 0 ? imageDimension.width - anchor.x : anchor.x;
    const verticalLimit = verticalDirection > 0 ? imageDimension.height - anchor.y : anchor.y;
    const maximumWidth = Math.max(0, Math.min(horizontalLimit, verticalLimit * ratio));
    width = this.clampAspectRatioWidth(width, maximumWidth, ratio);
    const croppedHeight = width / ratio;
    const left = horizontalDirection > 0 ? anchor.x : anchor.x - width;
    const top = verticalDirection > 0 ? anchor.y : anchor.y - croppedHeight;
    this.cropRectangle = Rectangle.fromTopLeft(new Vector(left, top), width, croppedHeight);
  }

  private resizeHorizontalEdge(
    imagePoint: Vector,
    initialRectangle: Rectangle,
    direction: -1 | 1,
    ratio: number
  ): void {
    const imageDimension = this.imageDimension();
    const anchorX = direction > 0 ? initialRectangle.topLeft.x : initialRectangle.bottomRight.x;
    const horizontalLimit = direction > 0 ? imageDimension.width - anchorX : anchorX;
    const verticalLimit =
      2 * Math.min(initialRectangle.center.y, imageDimension.height - initialRectangle.center.y);
    const maximumWidth = Math.max(0, Math.min(horizontalLimit, verticalLimit * ratio));
    const desiredWidth = Math.max(0, direction * (imagePoint.x - anchorX));
    const width = this.clampAspectRatioWidth(desiredWidth, maximumWidth, ratio);
    const height = width / ratio;
    const left = direction > 0 ? anchorX : anchorX - width;
    const top = initialRectangle.center.y - height / 2;
    this.cropRectangle = Rectangle.fromTopLeft(new Vector(left, top), width, height);
  }

  private resizeVerticalEdge(
    imagePoint: Vector,
    initialRectangle: Rectangle,
    direction: -1 | 1,
    ratio: number
  ): void {
    const imageDimension = this.imageDimension();
    const anchorY = direction > 0 ? initialRectangle.topLeft.y : initialRectangle.bottomRight.y;
    const verticalLimit = direction > 0 ? imageDimension.height - anchorY : anchorY;
    const horizontalLimit =
      2 * Math.min(initialRectangle.center.x, imageDimension.width - initialRectangle.center.x);
    const maximumHeight = Math.max(0, Math.min(verticalLimit, horizontalLimit / ratio));
    const desiredHeight = Math.max(0, direction * (imagePoint.y - anchorY));
    const height = this.clampAspectRatioHeight(desiredHeight, maximumHeight, ratio);
    const width = height * ratio;
    const left = initialRectangle.center.x - width / 2;
    const top = direction > 0 ? anchorY : anchorY - height;
    this.cropRectangle = Rectangle.fromTopLeft(new Vector(left, top), width, height);
  }

  private clampAspectRatioWidth(width: number, maximumWidth: number, ratio: number): number {
    const minimumSide = this.hitBoxSize / (this.context?.getZoom() ?? 1);
    const minimumWidth = Math.min(maximumWidth, Math.max(minimumSide, minimumSide * ratio));
    return clamp(width, minimumWidth, maximumWidth);
  }

  private clampAspectRatioHeight(height: number, maximumHeight: number, ratio: number): number {
    const minimumSide = this.hitBoxSize / (this.context?.getZoom() ?? 1);
    const minimumHeight = Math.min(maximumHeight, Math.max(minimumSide, minimumSide / ratio));
    return clamp(height, minimumHeight, maximumHeight);
  }
}
