/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Rectangle, Vector, clamp} from '../../math';
import {Canvas} from '../canvas';

export interface ZoomableImageCanvasProps {
  getImages?: (file: File) => Promise<ImageBitmap[]>;
  zoomFactor?: number;
  maxZoom?: number;
}

export class ZoomableImageCanvas extends Canvas {
  protected getImages: (file: File) => Promise<ImageBitmap[]>;
  protected images: ImageBitmap[] = [];
  protected imageDimensions: Rectangle[] = [];
  protected imageIndex = 0;
  private offset = Vector.ZERO;
  protected zoom = 1;
  private maxZoom: number;
  private zoomFactor: number;
  private dragStart: Vector | null = null;
  private isDragging = false;
  private lastZoom = this.zoom;
  private initialPinchDistance: number | null = null;
  private lastPointerDown: Vector | null = null;
  private eventListeners: Partial<Record<keyof HTMLElementEventMap, any>>;

  constructor(canvas: HTMLCanvasElement, props: ZoomableImageCanvasProps = {}) {
    super(canvas);

    ({
      getImages: this.getImages = async (file: File): Promise<ImageBitmap[]> => {
        return [await createImageBitmap(file)];
      },
      zoomFactor: this.zoomFactor = 1.1,
      maxZoom: this.maxZoom = 20,
    } = props);

    this.eventListeners = {
      mousedown: (e: MouseEvent) => this.handlePointerDown(this.getMouseEventCoordinates(e)),
      mousemove: (e: MouseEvent) => this.handlePointerMove(this.getMouseEventCoordinates(e)),
      mouseup: () => this.handlePointerUp(),
      mouseout: () => this.handlePointerUp(),
      wheel: (e: WheelEvent) => this.handleWheel(e),
      touchstart: (e: TouchEvent) =>
        this.handleTouch(e, () => this.handlePointerDown(this.getTouchEventCoordinates(e))),
      touchmove: (e: TouchEvent) =>
        this.handleTouch(e, () => this.handlePointerMove(this.getTouchEventCoordinates(e))),
      touchend: (e: TouchEvent) => this.handleTouch(e, () => this.handlePointerUp()),
    };

    Object.entries(this.eventListeners).forEach(([type, listener]) =>
      this.canvas.addEventListener(type, listener)
    );
  }

  protected getCursor(): string {
    return 'grab';
  }

  async setFile(file: File): Promise<void> {
    this.images.forEach((image: ImageBitmap) => image.close);
    this.images = await this.getImages(file);
    this.imageDimensions = this.images.map(
      (image: ImageBitmap) => new Rectangle(new Vector(image.width, image.height))
    );
    this.offset = Vector.ZERO;
    this.zoom = 1;
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

  protected getImage(): ImageBitmap | null {
    return this.images.length > this.imageIndex ? this.images[this.imageIndex] : null;
  }

  protected getImageDimension(): Rectangle {
    return this.imageDimensions.length > this.imageIndex
      ? this.imageDimensions[this.imageIndex]
      : Rectangle.ZERO;
  }

  protected draw(): void {
    const ctx: CanvasRenderingContext2D = this.context;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const image: ImageBitmap | null = this.getImage();
    if (image) {
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(this.offset.x, this.offset.y);
      const imageDimension: Rectangle = this.getImageDimension();
      ctx.drawImage(image, -imageDimension.center.x, -imageDimension.center.y);
      this.onImageDrawn();
      ctx.restore();
    }
  }

  protected onImageDrawn(): void {
    // noop
  }

  private getMouseEventCoordinates({offsetX, offsetY}: MouseEvent): Vector {
    return new Vector(offsetX, offsetY);
  }

  private getTouchEventCoordinates(e: TouchEvent, index = 0): Vector {
    const {left, top} = this.canvas.getBoundingClientRect();
    return new Vector(e.touches[index].clientX - left, e.touches[index].clientY - top);
  }

  private canvasToWorld({x, y}: Vector): Vector {
    return new Vector(
      (x - this.canvas.width / 2) / this.zoom,
      (y - this.canvas.height / 2) / this.zoom
    );
  }

  private getMaxOffset(): Vector {
    const imageDimension: Rectangle = this.getImageDimension();
    return new Vector(
      Math.abs(imageDimension.width - this.canvas.width / this.zoom) / 2,
      Math.abs(imageDimension.height - this.canvas.height / this.zoom) / 2
    );
  }

  private getMinZoom(): number {
    const image: ImageBitmap | null = this.getImage();
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected onClickOrTap(point: Vector): void {
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
      this.setZoom(zoomFactor * this.lastZoom);
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

  setOffset(point: Vector): void {
    this.offset = this.clampOffset(point);
    this.draw();
  }

  setZoom(zoom: number): void {
    this.zoom = clamp(zoom, this.getMinZoom(), this.maxZoom);
    this.offset = this.clampOffset(this.offset);
    this.draw();
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

  public override destroy(): void {
    Object.entries(this.eventListeners).forEach(([type, listener]) =>
      this.canvas.removeEventListener(type, listener)
    );
  }
}
