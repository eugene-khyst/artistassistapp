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
import {offscreenCanvasToBlob} from '~/src/utils/graphics';

export interface ZoomableImageCanvasProps {
  zoomFactor?: number;
  maxZoom?: number;
  imageSmoothingEnabled?: boolean;
}

export class ZoomableImageCanvas extends Canvas {
  protected images: ImageBitmap[] = [];
  protected imageDimensions: Rectangle[] = [];
  protected imageIndex = 0;
  protected offset = Vector.ZERO;
  protected zoom = 1;
  private readonly maxZoom: number;
  private readonly zoomFactor: number;
  private readonly imageSmoothingEnabled: boolean;
  private dragDelayTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly longPressDurationMs = 250;
  private dragStart: Vector | null = null;
  private isDragging = false;
  private lastZoom = this.zoom;
  private initialPinchDistance: number | null = null;
  private initialPinchCenter: Vector | null = null;
  private initialOffset: Vector | null = null;
  private lastPointerDown: Vector | null = null;
  private readonly eventListeners: Partial<Record<keyof HTMLElementEventMap, any>>;

  constructor(canvas: HTMLCanvasElement, props: ZoomableImageCanvasProps = {}) {
    super(canvas);

    ({
      zoomFactor: this.zoomFactor = 1.1,
      maxZoom: this.maxZoom = 20,
      imageSmoothingEnabled: this.imageSmoothingEnabled = true,
    } = props);

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
    this.initialPinchDistance = null;
    this.zoom = this.getMinZoom();
    this.lastZoom = this.zoom;
    this.onImagesLoaded();
    this.requestRedraw();
  }

  protected onImagesLoaded(): void {
    // noop
  }

  setImageIndex(imageIndex: number): void {
    this.imageIndex = imageIndex;
    this.requestRedraw();
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

  protected toImagePoint(point: Vector): Vector {
    const {center} = this.getImageDimension();
    return point.add(center);
  }

  protected imageContains(point: Vector, shrinkBy?: number): boolean {
    const imageDimension = this.getImageDimension();
    return imageDimension.contains(point.add(imageDimension.center), shrinkBy);
  }

  protected override draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const canvas: HTMLCanvasElement | OffscreenCanvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = this.imageSmoothingEnabled;
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

  protected onImageDrawn(_: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
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
    const x = Math.max(0, (width - this.canvas.width / this.zoom) / 2);
    const y = Math.max(0, (height - this.canvas.height / this.zoom) / 2);
    return new Vector(x, y);
  }

  private getMinZoom(): number {
    const image: ImageBitmap | OffscreenCanvas | null = this.getImage();
    return !image
      ? 1
      : Math.min(this.canvas.width / image.width, this.canvas.height / image.height);
  }

  private clampZoom(zoom: number): number {
    return clamp(zoom, this.getMinZoom(), this.maxZoom);
  }

  private clampOffset({x, y}: Vector): Vector {
    const maxOffset = this.getMaxOffset();
    return new Vector(clamp(x, -maxOffset.x, maxOffset.x), clamp(y, -maxOffset.y, maxOffset.y));
  }

  protected onDragStart(_: Vector): void {
    // noop
  }

  private handlePointerDown(point: Vector): void {
    if (this.dragDelayTimerId) {
      clearTimeout(this.dragDelayTimerId);
    }

    this.lastPointerDown = point;
    this.isDragging = false;
    this.dragStart = this.canvasToWorld(point).subtract(this.offset);

    this.dragDelayTimerId = setTimeout(() => {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
      this.onDragStart(this.dragStart!);
    }, this.longPressDurationMs);

    this.requestRedraw();
  }

  protected onDrag(point: Vector, dragStart: Vector): void {
    this.setOffset(point.subtract(dragStart));
  }

  private handlePointerMove(point: Vector): void {
    if (!this.dragStart) {
      return;
    }
    if (!this.isDragging) {
      if (this.lastPointerDown && point.subtract(this.lastPointerDown).length() > 5) {
        if (this.dragDelayTimerId) {
          clearTimeout(this.dragDelayTimerId);
        }
        this.isDragging = true;
        this.canvas.style.cursor = 'grabbing';
        this.onDragStart(this.dragStart);
      }
    }
    if (this.isDragging) {
      this.onDrag(this.canvasToWorld(point), this.dragStart);
    }
    this.requestRedraw();
  }

  protected onClickOrTap(_: Vector): void {
    // noop
  }

  protected onDragEnd(): void {
    // noop
  }

  private handlePointerUp(): void {
    if (this.dragDelayTimerId) {
      clearTimeout(this.dragDelayTimerId);
    }

    if (!this.isDragging && this.dragStart) {
      this.onClickOrTap(this.dragStart);
    }

    if (this.isDragging) {
      this.onDragEnd();
    }

    this.dragStart = null;
    this.isDragging = false;

    this.initialPinchDistance = null;
    this.initialPinchCenter = null;
    this.initialOffset = null;

    this.lastZoom = this.zoom;
    this.canvas.style.cursor = this.getCursor();

    this.requestRedraw();
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
    const currentPinchCenter = touch1.add(touch2).divide(2);

    if (this.initialPinchDistance === null) {
      this.initialPinchDistance = currentDistance;
      this.initialPinchCenter = currentPinchCenter;
      this.initialOffset = this.offset;
      this.lastZoom = this.zoom;
      return;
    }

    const newZoom = this.clampZoom((currentDistance / this.initialPinchDistance) * this.lastZoom);

    const canvasCenter = this.getCanvasCenter();
    const term1 = currentPinchCenter.subtract(canvasCenter).divide(newZoom);
    const term2 = this.initialPinchCenter!.subtract(canvasCenter).divide(this.lastZoom);
    const newOffset = term1.subtract(term2).add(this.initialOffset!);

    this.setTransform(newZoom, newOffset);
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this.dragStart) {
      this.requestRedraw();
      return;
    }

    const oldZoom = this.zoom;
    const newZoom = this.clampZoom(
      e.deltaY > 0 ? oldZoom / this.zoomFactor : oldZoom * this.zoomFactor
    );

    if (newZoom === oldZoom) {
      return;
    }

    const mousePoint = new Vector(e.offsetX, e.offsetY);
    const canvasCenter = this.getCanvasCenter();
    const mouseToCenter = mousePoint.subtract(canvasCenter);

    const newOffset = this.offset
      .subtract(mouseToCenter.divide(oldZoom))
      .add(mouseToCenter.divide(newZoom));

    this.setTransform(newZoom, newOffset);
  }

  private setTransform(zoom: number, offset: Vector): void {
    this.zoom = this.clampZoom(zoom);
    this.offset = this.clampOffset(offset);
    this.requestRedraw();
  }

  private setOffset(point: Vector): void {
    this.setTransform(this.zoom, point);
  }

  private setZoom(zoom: number): void {
    this.setTransform(zoom, this.offset);
    this.lastZoom = this.zoom;
  }

  setMinZoom(): void {
    this.setZoom(this.getMinZoom());
  }

  protected override onCanvasResized(): void {
    this.setTransform(this.zoom, this.offset);
  }

  protected getBlobSource(): OffscreenCanvas | null {
    const image: ImageBitmap | OffscreenCanvas | null = this.getImage();
    if (!image) {
      return null;
    }
    const {offset, zoom} = this;
    try {
      this.offset = Vector.ZERO;
      this.zoom = 1;
      const offscreenCanvas = new OffscreenCanvas(image.width, image.height);
      const ctx: OffscreenCanvasRenderingContext2D = offscreenCanvas.getContext('2d')!;
      this.draw(ctx);
      return offscreenCanvas;
    } finally {
      this.offset = offset;
      this.zoom = zoom;
    }
  }

  async convertToBlob(options?: ImageEncodeOptions): Promise<Blob | undefined> {
    const blobSource: OffscreenCanvas | null = this.getBlobSource();
    if (!blobSource) {
      return;
    }
    return await offscreenCanvasToBlob(blobSource, options);
  }

  async saveAsImage(filename?: string, type?: string): Promise<void> {
    const blob: Blob | undefined = await this.convertToBlob({type});
    if (blob) {
      saveAs(blob, filename);
    }
  }

  override destroy(): void {
    super.destroy();
    Object.entries(this.eventListeners).forEach(([type, listener]) => {
      this.canvas.removeEventListener(type, listener as EventListener);
    });
  }
}
