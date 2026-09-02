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

import {clamp} from '@eugene-khyst/artistassistapp-color-mixer';
import {saveAs} from 'file-saver';

import {Canvas} from '@/services/canvas/canvas';
import type {
  CanvasDrag,
  CanvasMode,
  CanvasModeContext,
  CanvasPointer,
} from '@/services/canvas/mode/canvas-mode';
import {EventManager} from '@/services/event/event-manager';
import {Rectangle, Vector} from '@/services/math/geometry';
import {
  type DrawImageSource,
  fillOffscreenCanvasBackground,
  offscreenCanvasToBlob,
} from '@/utils/graphics';

const MIN_IMAGE_SIDE = 200;

export enum ZoomableImageEventType {
  ClickOrTap = 'ClickOrTap',
}

export type ClickOrTapEvent = CanvasPointer;

export interface ZoomableImageCanvasProps {
  allowZoomBelowFit?: boolean;
  maxZoom?: number;
  zoomFactor?: number;
  imageSmoothingEnabled?: boolean;
}

export class ZoomableImageCanvas extends Canvas {
  protected images: DrawImageSource[] = [];
  protected imageDimensions: Rectangle[] = [];
  protected imageIndex = 0;
  protected offset = Vector.ZERO;
  protected zoom = 1;
  private readonly zoomFactor: number;
  private readonly maxZoom: number;
  private readonly allowZoomBelowFit: boolean;
  private readonly imageSmoothingEnabled: boolean;
  private dragDelayTimerId: ReturnType<typeof setTimeout> | null = null;
  private readonly longPressDurationMs = 250;
  private dragStart: CanvasPointer | null = null;
  private isDragging = false;
  private lastZoom = this.zoom;
  private initialPinchDistance: number | null = null;
  private initialPinchCenter: Vector | null = null;
  private initialOffset: Vector | null = null;
  private lastPointerDown: Vector | null = null;
  private autoFit = true;
  private exporting = false;
  private mode: CanvasMode | null = null;
  private modeDrag?: CanvasDrag;
  private readonly eventListeners: {
    [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void;
  };
  public readonly events = new EventManager();
  private cursor = 'grab';
  private readonly modeContext: CanvasModeContext = {
    getCanvas: () => this.canvas,
    getImages: () => this.images,
    getImageIndex: () => this.imageIndex,
    getImageDimension: () => this.getImageDimension(),
    getSourceImageDimension: () => this.getSourceImageDimension(),
    getZoom: () => this.zoom,
    isExporting: () => this.exporting,
    zoomToFit: () => {
      this.zoomToFit();
    },
    requestRedraw: () => {
      this.requestRedraw();
    },
    refreshCursor: () => {
      this.refreshCursor();
    },
  };

  constructor(canvas: HTMLCanvasElement, props: ZoomableImageCanvasProps = {}) {
    super(canvas);

    ({
      zoomFactor: this.zoomFactor = 1.1,
      maxZoom: this.maxZoom = 20,
      allowZoomBelowFit: this.allowZoomBelowFit = false,
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

  static imageDimension(image: DrawImageSource | null): Rectangle {
    return image ? new Rectangle(new Vector(image.width, image.height)) : Rectangle.ZERO;
  }

  protected getCursor(): string {
    return this.mode?.getCursor?.() ?? this.cursor;
  }

  setCursor(cursor: string): void {
    this.cursor = cursor;
    this.refreshCursor();
  }

  private refreshCursor(): void {
    this.canvas.style.cursor = this.getCursor();
  }

  setMode(mode: CanvasMode | null): void {
    if (mode === this.mode) {
      return;
    }
    this.modeDrag?.cancel();
    this.modeDrag = undefined;
    this.mode?.deactivate();
    this.mode = mode;
    this.mode?.activate(this.modeContext);
    this.mode?.onImagesLoaded?.();
    this.refreshCursor();
    this.requestRedraw();
  }

  setImages(images: ImageBitmap[], displayDimension?: Rectangle): void {
    const prev = this.getImageDimension();
    this.images = images;
    this.imageDimensions = images.map(
      image => displayDimension ?? ZoomableImageCanvas.imageDimension(image)
    );
    this.dragStart = null;
    this.isDragging = false;
    this.initialPinchDistance = null;
    this.onImagesLoaded();
    this.zoomToFitIfResized(prev);
    this.requestRedraw();
  }

  protected onImagesLoaded(): void {
    this.mode?.onImagesLoaded?.();
  }

  setImageIndex(imageIndex: number): void {
    const prev = this.getImageDimension();
    this.imageIndex = imageIndex;
    this.zoomToFitIfResized(prev);
    this.requestRedraw();
  }

  private getSourceImage(): DrawImageSource | null {
    return this.images[this.imageIndex] ?? null;
  }

  protected getImage(): DrawImageSource | null {
    const image = this.getSourceImage();
    return this.mode?.getImage ? this.mode.getImage(image) : image;
  }

  private getSourceImageDimension(): Rectangle {
    return this.imageDimensions[this.imageIndex] ?? Rectangle.ZERO;
  }

  protected getImageDimension(): Rectangle {
    const dimension = this.getSourceImageDimension();
    return this.mode?.getImageDimension?.(dimension) ?? dimension;
  }

  protected imageContains(imageCenteredPoint: Vector, shrinkBy?: number): boolean {
    const imageDimension = this.getImageDimension();
    return imageDimension.contains(this.imageCenteredToImagePoint(imageCenteredPoint), shrinkBy);
  }

  protected override draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const canvas: HTMLCanvasElement | OffscreenCanvas = ctx.canvas;
    const isMainCanvas = canvas === this.canvas;
    const dpr = isMainCanvas ? this.dpr : 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.imageSmoothingEnabled = this.imageSmoothingEnabled;
    ctx.save();
    ctx.translate(cssW / 2, cssH / 2);
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
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.mode?.onBeforeImageDrawn?.(ctx);
  }

  protected drawImage(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const image: DrawImageSource | null = this.getImage();
    // A closed ImageBitmap reports no size, and the store can close one before React re-renders.
    if (!image?.width || !image.height) {
      return;
    }
    const imageDimension = this.getImageDimension();
    const rectangle =
      this.mode?.getSourceImageRectangle?.(this.getSourceImageDimension()) ?? imageDimension;
    const {topLeft, width, height} = rectangle;
    ctx.drawImage(
      image,
      topLeft.x - imageDimension.center.x,
      topLeft.y - imageDimension.center.y,
      width,
      height
    );
  }

  protected onImageDrawn(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    this.mode?.onImageDrawn?.(ctx);
  }

  private getMouseEventCoordinates({offsetX, offsetY}: MouseEvent): Vector {
    return new Vector(offsetX, offsetY);
  }

  private getTouchEventCoordinates(e: TouchEvent, index = 0): Vector {
    const {left, top} = this.canvas.getBoundingClientRect();
    return new Vector(e.touches[index]!.clientX - left, e.touches[index]!.clientY - top);
  }

  private canvasToWorld({x, y}: Vector): Vector {
    return new Vector((x - this.cssWidth / 2) / this.zoom, (y - this.cssHeight / 2) / this.zoom);
  }

  private worldToImageCenteredPoint(worldPoint: Vector): Vector {
    return worldPoint.subtract(this.offset);
  }

  private imageCenteredToImagePoint(imageCenteredPoint: Vector): Vector {
    return imageCenteredPoint.add(this.getImageDimension().center);
  }

  private canvasPointerFromCanvasPoint(canvasPoint: Vector): CanvasPointer {
    const worldPoint = this.canvasToWorld(canvasPoint);
    const imageCenteredPoint = this.worldToImageCenteredPoint(worldPoint);
    const imagePoint = this.imageCenteredToImagePoint(imageCenteredPoint);
    return {
      canvasPoint,
      worldPoint,
      imageCenteredPoint,
      imagePoint,
    };
  }

  canvasPointerFromImageCenteredPoint(imageCenteredPoint: Vector): CanvasPointer {
    const worldPoint = imageCenteredPoint.add(this.offset);
    const canvasPoint = worldPoint.multiply(this.zoom).add(this.getCanvasCenter());
    return {
      canvasPoint,
      worldPoint,
      imageCenteredPoint,
      imagePoint: this.imageCenteredToImagePoint(imageCenteredPoint),
    };
  }

  private getMaxOffset(): Vector {
    const {width, height}: Rectangle = this.getImageDimension();
    const x = Math.max(0, (width - this.cssWidth / this.zoom) / 2);
    const y = Math.max(0, (height - this.cssHeight / this.zoom) / 2);
    return new Vector(x, y);
  }

  private getFitToCanvasZoom(): number {
    const {width, height} = this.getImageDimension();
    return width && height ? Math.min(this.cssWidth / width, this.cssHeight / height) : 1;
  }

  private getMinZoom(): number {
    const {width, height} = this.getImageDimension();
    return width && height ? Math.min(MIN_IMAGE_SIDE / width, MIN_IMAGE_SIDE / height) : 1;
  }

  private clampZoom(zoom: number): number {
    const minZoom: number = this.allowZoomBelowFit ? this.getMinZoom() : this.getFitToCanvasZoom();
    return clamp(zoom, minZoom, this.maxZoom);
  }

  private clampOffset({x, y}: Vector): Vector {
    const maxOffset = this.getMaxOffset();
    return new Vector(clamp(x, -maxOffset.x, maxOffset.x), clamp(y, -maxOffset.y, maxOffset.y));
  }

  private startDrag(pointer: CanvasPointer): void {
    this.modeDrag = this.mode?.startDrag?.(pointer);
  }

  private handlePointerDown(point: Vector): void {
    if (this.dragDelayTimerId) {
      clearTimeout(this.dragDelayTimerId);
    }

    this.lastPointerDown = point;
    this.isDragging = false;
    this.dragStart = this.canvasPointerFromCanvasPoint(point);

    this.dragDelayTimerId = setTimeout(() => {
      this.isDragging = true;
      this.canvas.style.cursor = 'grabbing';
      this.startDrag(this.dragStart!);
    }, this.longPressDurationMs);

    this.requestRedraw();
  }

  protected onDrag(pointer: CanvasPointer, dragStart: CanvasPointer): void {
    if (this.modeDrag) {
      this.modeDrag.move(pointer);
      return;
    }
    this.autoFit = false;
    this.setOffset(pointer.worldPoint.subtract(dragStart.imageCenteredPoint));
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
        this.startDrag(this.dragStart);
      }
    }
    if (this.isDragging) {
      this.onDrag(this.canvasPointerFromCanvasPoint(point), this.dragStart);
    }
    this.requestRedraw();
  }

  protected onClickOrTap(pointer: CanvasPointer): void {
    if (this.mode?.onClickOrTap?.(pointer)) {
      return;
    }
    if (!this.imageContains(pointer.imageCenteredPoint)) {
      return;
    }
    this.events.notify(ZoomableImageEventType.ClickOrTap, pointer);
  }

  protected onDragEnd(): void {
    this.modeDrag?.end();
    this.modeDrag = undefined;
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
      this.modeDrag?.cancel();
      this.modeDrag = undefined;
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

    this.autoFit = false;
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

    this.autoFit = false;
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

  zoomToFit(): void {
    this.autoFit = true;
    this.offset = Vector.ZERO;
    this.setZoom(this.getFitToCanvasZoom());
  }

  private zoomToFitIfResized(prev: Rectangle): void {
    if (!this.getImageDimension().sameSize(prev)) {
      this.zoomToFit();
    }
  }

  disableAutoFit(): void {
    this.autoFit = false;
  }

  protected override onCanvasResized(): void {
    if (this.autoFit) {
      this.zoom = this.getFitToCanvasZoom();
      this.offset = Vector.ZERO;
      this.lastZoom = this.zoom;
      this.requestRedraw();
    } else {
      this.setTransform(this.zoom, this.offset);
    }
  }

  convertToOffscreenCanvas(): OffscreenCanvas | null {
    const image: DrawImageSource | null = this.getImage();
    if (!image) {
      return null;
    }
    const {width, height} = this.getImageDimension();
    const {offset, zoom, exporting} = this;
    try {
      this.exporting = true;
      this.offset = Vector.ZERO;
      this.zoom = 1;
      const offscreenCanvas = new OffscreenCanvas(width, height);
      const ctx: OffscreenCanvasRenderingContext2D = offscreenCanvas.getContext('2d')!;
      this.draw(ctx);
      return offscreenCanvas;
    } finally {
      this.offset = offset;
      this.zoom = zoom;
      this.exporting = exporting;
    }
  }

  async convertToBlob(options?: ImageEncodeOptions): Promise<Blob | undefined> {
    const canvas: OffscreenCanvas | null = this.convertToOffscreenCanvas();
    if (!canvas) {
      return;
    }
    if ((options?.type ?? 'image/jpeg') === 'image/jpeg') {
      fillOffscreenCanvasBackground(canvas, '#fff');
    }
    return await offscreenCanvasToBlob(canvas, options);
  }

  async saveAsImage(filename?: string, type?: string): Promise<void> {
    const blob: Blob | undefined = await this.convertToBlob({type});
    if (blob) {
      saveAs(blob, filename);
    }
  }

  override destroy(): void {
    this.modeDrag?.cancel();
    this.modeDrag = undefined;
    this.mode?.deactivate();
    this.mode = null;
    super.destroy();
    Object.entries(this.eventListeners).forEach(([type, listener]) => {
      this.canvas.removeEventListener(type, listener as EventListener);
    });
    this.events.destroy();
  }
}
