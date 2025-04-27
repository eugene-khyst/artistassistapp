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

import {saveAs} from 'file-saver';

import {Canvas} from '~/src/services/canvas/canvas';
import {clamp} from '~/src/services/math/clamp';
import {Rectangle, Vector} from '~/src/services/math/geometry';

interface ConvertToBlobOptions {
  type?: string;
  quality?: number;
}

export interface ZoomableImageCanvasProps {
  zoomFactor?: number;
  maxZoom?: number;
}

export class ZoomableImageCanvas extends Canvas {
  protected images: ImageBitmap[] = [];
  protected imageDimensions: Rectangle[] = [];
  protected imageIndex = 0;
  private offset = Vector.ZERO;
  protected zoom = 1;
  private readonly maxZoom: number;
  private readonly zoomFactor: number;
  private dragStart: Vector | null = null;
  private isDragging = false;
  private lastZoom = this.zoom;
  private initialPinchDistance: number | null = null;
  private lastPointerDown: Vector | null = null;
  private readonly eventListeners: Partial<Record<keyof HTMLElementEventMap, any>>;

  constructor(canvas: HTMLCanvasElement, props: ZoomableImageCanvasProps = {}) {
    super(canvas);

    ({zoomFactor: this.zoomFactor = 1.1, maxZoom: this.maxZoom = 20} = props);

    this.eventListeners = {
      mousedown: (e: MouseEvent) => {
        this.handlePointerDown(this.getMouseEventCoordinates(e));
      },
      mousemove: (e: MouseEvent) => {
        this.handlePointerMove(this.getMouseEventCoordinates(e));
      },
      mouseup: () => {
        this.handlePointerUp();
      },
      mouseout: () => {
        this.handlePointerUp();
      },
      wheel: (e: WheelEvent) => {
        this.handleWheel(e);
      },
      touchstart: (e: TouchEvent) => {
        this.handleTouch(e, () => {
          this.handlePointerDown(this.getTouchEventCoordinates(e));
        });
      },
      touchmove: (e: TouchEvent) => {
        this.handleTouch(e, () => {
          this.handlePointerMove(this.getTouchEventCoordinates(e));
        });
      },
      touchend: (e: TouchEvent) => {
        this.handleTouch(e, () => {
          this.handlePointerUp();
        });
      },
    };

    Object.entries(this.eventListeners).forEach(([type, listener]) => {
      this.canvas.addEventListener(type, listener as EventListener);
    });
  }

  protected getCursor(): string {
    return 'grab';
  }

  setImages(images: ImageBitmap[]): void {
    this.images = images;
    this.imageDimensions = this.images.map(
      (image: ImageBitmap) => new Rectangle(new Vector(image.width, image.height))
    );
    this.offset = Vector.ZERO;
    this.dragStart = null;
    this.isDragging = false;
    this.lastZoom = this.zoom;
    this.initialPinchDistance = null;
    this.zoom = this.getMinZoom();
    this.lastZoom = this.zoom;
    this.onImagesLoaded();
    this.draw();
  }

  protected onImagesLoaded(): void {
    // noop
  }

  public setImageIndex(imageIndex: number): void {
    this.imageIndex = imageIndex;
    this.draw();
  }

  protected getImage(images?: ImageBitmap[]): ImageBitmap | null {
    images ??= this.images;
    return images.length > this.imageIndex ? images[this.imageIndex]! : null;
  }

  protected getImageDimension(): Rectangle {
    return this.imageDimensions.length > this.imageIndex
      ? this.imageDimensions[this.imageIndex]!
      : Rectangle.ZERO;
  }

  protected draw(ctx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx ??= this.context;
    const canvas: HTMLCanvasElement | OffscreenCanvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(this.offset.x, this.offset.y);
    try {
      this.onBeforeImageDrawn(ctx);
      this.drawImage(ctx);
      this.onImageDrawn(ctx);
    } catch (error) {
      console.error(error);
    }
    ctx.restore();
  }

  protected onBeforeImageDrawn(
    _ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    // noop
  }

  protected drawImage(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    images?: ImageBitmap[]
  ): void {
    const image: ImageBitmap | null = this.getImage(images);
    if (image) {
      const {center}: Rectangle = this.getImageDimension();
      ctx.drawImage(image, -center.x, -center.y);
    }
  }

  protected onImageDrawn(_ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    // noop
  }

  private getMouseEventCoordinates({offsetX, offsetY}: MouseEvent): Vector {
    return new Vector(offsetX, offsetY);
  }

  private getTouchEventCoordinates(e: TouchEvent, index = 0): Vector {
    const {left, top} = this.canvas.getBoundingClientRect();
    return new Vector(e.touches[index]!.clientX - left, e.touches[index]!.clientY - top);
  }

  private canvasToWorld({x, y}: Vector): Vector {
    const {width, height} = this.canvas;
    return new Vector((x - width / 2) / this.zoom, (y - height / 2) / this.zoom);
  }

  private getMaxOffset(): Vector {
    const {width, height}: Rectangle = this.getImageDimension();
    return new Vector(
      Math.abs(width - this.canvas.width / this.zoom) / 2,
      Math.abs(height - this.canvas.height / this.zoom) / 2
    );
  }

  private getMinZoom(): number {
    const image: ImageBitmap | OffscreenCanvas | null = this.getImage();
    return !image
      ? 1
      : Math.min(this.canvas.width / image.width, this.canvas.height / image.height);
  }

  private clampOffset({x, y}: Vector): Vector {
    const maxOffset = this.getMaxOffset();
    return new Vector(clamp(x, -maxOffset.x, maxOffset.x), clamp(y, -maxOffset.y, maxOffset.y));
  }

  private handlePointerDown(point: Vector): void {
    this.lastPointerDown = point;
    this.dragStart = this.canvasToWorld(point).subtract(this.offset);
  }

  private handlePointerMove(point: Vector): void {
    if (!this.lastPointerDown || point.subtract(this.lastPointerDown).length() < 10) {
      return;
    }
    if (this.dragStart) {
      this.isDragging = true;
      const offset = this.canvasToWorld(point).subtract(this.dragStart);
      this.setOffset(offset);
      this.canvas.style.cursor = 'grabbing';
    }
  }

  protected onClickOrTap(_vector: Vector): void {
    // noop
  }

  private handlePointerUp(): void {
    if (!this.isDragging && this.dragStart) {
      this.onClickOrTap(this.dragStart);
    }
    this.dragStart = null;
    this.isDragging = false;
    this.initialPinchDistance = null;
    this.lastZoom = this.zoom;
    this.canvas.style.cursor = this.getCursor();
  }

  private handleTouch(e: TouchEvent, singleTouchHandler: () => void): void {
    e.preventDefault();
    if (e.touches.length <= 1) {
      singleTouchHandler();
    } else if (e.type == 'touchmove' && e.touches.length == 2) {
      this.dragStart = null;
      this.isDragging = false;
      this.handlePinch(e);
    }
  }

  private handlePinch(e: TouchEvent): void {
    const touch1 = this.getTouchEventCoordinates(e, 0);
    const touch2 = this.getTouchEventCoordinates(e, 1);
    const currentDistance = Math.hypot(touch1.x - touch2.x, touch1.y - touch2.y);
    if (this.initialPinchDistance == null) {
      this.initialPinchDistance = currentDistance;
    } else {
      const zoomFactor = currentDistance / this.initialPinchDistance;
      this.setZoom(zoomFactor * this.lastZoom, false);
    }
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    if (!this.dragStart) {
      if (e.deltaY > 0) {
        this.zoomOut();
      } else {
        this.zoomIn();
      }
    }
  }

  private setOffset(point: Vector): void {
    this.offset = this.clampOffset(point);
    this.draw();
  }

  private setZoom(zoom: number, resetPinch = true): void {
    this.zoom = clamp(zoom, this.getMinZoom(), this.maxZoom);
    this.offset = this.clampOffset(this.offset);
    if (resetPinch) {
      this.initialPinchDistance = null;
      this.lastZoom = this.zoom;
    }
    this.draw();
  }

  setMinZoom(): void {
    this.setZoom(0);
  }

  zoomIn(): void {
    this.setZoom(this.zoom * this.zoomFactor);
  }

  zoomOut(): void {
    this.setZoom(this.zoom / this.zoomFactor);
  }

  protected override onCanvasResized(): void {
    this.setZoom(this.zoom);
  }

  async convertToBlob(options?: ConvertToBlobOptions): Promise<Blob | undefined> {
    const image: ImageBitmap | OffscreenCanvas | null = this.getImage();
    if (!image) {
      return;
    }
    const {type = 'image/jpeg', quality = 0.95} = options ?? {};
    const {offset, zoom} = this;
    try {
      this.offset = Vector.ZERO;
      this.zoom = 1;
      const offscreenCanvas = new OffscreenCanvas(image.width, image.height);
      const ctx: OffscreenCanvasRenderingContext2D = offscreenCanvas.getContext('2d')!;
      this.draw(ctx);
      return await offscreenCanvas.convertToBlob({type, quality});
    } finally {
      this.offset = offset;
      this.zoom = zoom;
    }
  }

  async saveAsImage(filename?: string, type?: string): Promise<void> {
    const blob: Blob | undefined = await this.convertToBlob({type});
    if (blob) {
      saveAs(blob, filename);
    }
  }

  public override destroy(): void {
    Object.entries(this.eventListeners).forEach(([type, listener]) => {
      this.canvas.removeEventListener(type, listener as EventListener);
    });
  }
}
