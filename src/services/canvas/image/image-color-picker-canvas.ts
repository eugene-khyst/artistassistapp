/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ZoomableImageCanvas, ZoomableImageCanvasProps} from '.';
import {getRgbaForCoord, imageBitmapToOffscreenCanvas} from '../../../utils';
import {Rgb, RgbTuple, linearizeRgbChannel, unlinearizeRgbChannel} from '../../color/model';
import {EventManager} from '../../event';
import {Rectangle, Vector, clamp} from '../../math';

export const MIN_COLOR_PICKER_DIAMETER = 1;
export const MAX_COLOR_PICKER_DIAMETER = 100;

export enum ColorPickerEventType {
  PipetPointSet = 'pipetpointset',
}

export interface PipetPointSetEvent {
  point: Vector;
  diameter: number;
  rgb: Rgb;
}

export interface ImageColorPickerCanvasProps extends ZoomableImageCanvasProps {
  cursorDiameter?: number;
}

export class ImageColorPickerCanvas extends ZoomableImageCanvas {
  private offscreenCanvases: OffscreenCanvas[] = [];
  private pipetDiameter: number;
  private pipetPoint: Vector | null = null;
  private pipetRgb: Rgb = Rgb.WHITE;
  private lastPipetDiameter: number;
  private cursorDiameter: number;
  public events: EventManager<ColorPickerEventType> = new EventManager();

  constructor(canvas: HTMLCanvasElement, props: ImageColorPickerCanvasProps = {}) {
    super(canvas, props);

    ({cursorDiameter: this.cursorDiameter = 20} = props);

    this.pipetDiameter = 1;
    this.lastPipetDiameter = this.pipetDiameter;
  }

  protected override getCursor(): string {
    return 'crosshair';
  }

  protected override onImagesLoaded(): void {
    this.initOffscreenCanvases();
    this.pipetPoint = null;
  }

  protected initOffscreenCanvases(): void {
    this.offscreenCanvases = this.images.map((bitmap: ImageBitmap) => {
      const [canvas] = imageBitmapToOffscreenCanvas(bitmap);
      return canvas;
    });
  }

  protected getOffscreenCanvas(): OffscreenCanvas | null {
    return this.images.length > this.imageIndex ? this.offscreenCanvases[this.imageIndex] : null;
  }

  private drawPipet(): void {
    if (this.pipetPoint) {
      const pipetDiameter = this.lastPipetDiameter;
      const lineWidth = 2 / this.zoom;
      const cursorDiameter =
        this.cursorDiameter > pipetDiameter ? this.cursorDiameter : pipetDiameter + 2;
      const ctx: CanvasRenderingContext2D = this.context;
      ctx.lineWidth = lineWidth;
      const isDark = this.pipetRgb.isDark();
      let isDarkToggle = isDark;
      for (let i = 3; i >= 1; i--) {
        ctx.strokeStyle = isDarkToggle ? '#000' : '#fff';
        const size = cursorDiameter + 2 * i * lineWidth;
        ctx.strokeRect(this.pipetPoint.x - size / 2, this.pipetPoint.y - size / 2, size, size);
        isDarkToggle = !isDarkToggle;
      }
      ctx.strokeStyle = isDark ? '#fff' : '#000';
      ctx.beginPath();
      ctx.arc(this.pipetPoint.x, this.pipetPoint.y, pipetDiameter / 2, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  protected override onImageDrawn(): void {
    this.drawPipet();
  }

  protected override onClickOrTap(point: Vector): void {
    this.setPipetPoint(point);
  }

  getLastPipetDiameter(): number {
    return this.lastPipetDiameter;
  }

  setPipetDiameter(pipetDiameter: number): void {
    this.pipetDiameter = clamp(pipetDiameter, MIN_COLOR_PICKER_DIAMETER, MAX_COLOR_PICKER_DIAMETER);
  }

  getPipetPoint(): Vector | null {
    return this.pipetPoint;
  }

  async setPipetPoint(pipetPoint: Vector): Promise<void> {
    const imageDimension: Rectangle = this.getImageDimension();
    const point = pipetPoint.add(imageDimension.center);
    if (imageDimension.contains(point, this.pipetDiameter / 2)) {
      this.pipetPoint = pipetPoint;
      this.pipetRgb = (await this.getAverageColor(point)) ?? Rgb.WHITE;
      this.lastPipetDiameter = this.pipetDiameter;
      const event: PipetPointSetEvent = {
        point,
        diameter: this.lastPipetDiameter,
        rgb: this.pipetRgb,
      };
      this.events.notify(ColorPickerEventType.PipetPointSet, event);
      this.draw();
    }
  }

  private async getAverageColor({x, y}: Vector): Promise<Rgb | null> {
    const diameter = Math.round(this.pipetDiameter);
    const radius = diameter / 2;
    const canvas: OffscreenCanvas | null = this.getOffscreenCanvas();
    if (!canvas) {
      console.error('OffscreenCanvas is null');
      return null;
    }
    const imageData: ImageData = canvas
      .getContext('2d')!
      .getImageData(Math.round(x - radius), Math.round(y - radius), diameter, diameter);
    return this.getAverageColorFromImageData(imageData);
  }

  private getAverageColorFromImageData({data, width, height}: ImageData): Rgb {
    if (data.length <= 4) {
      return new Rgb(data[0], data[1], data[2]);
    } else {
      const diameter = Math.trunc(Math.min(width, height));
      const radius = Math.trunc(diameter / 2);
      const radiusPow2 = radius * radius;
      const total: RgbTuple = [0, 0, 0];
      let count = 0;
      for (let y = 0; y < diameter; y++) {
        for (let x = 0; x < diameter; x++) {
          if (Math.pow(x - radius, 2) + Math.pow(y - radius, 2) <= radiusPow2) {
            const color: number[] = getRgbaForCoord(data, x, y, width);
            for (let channel = 0; channel <= 2; channel++) {
              total[channel] += linearizeRgbChannel(color[channel]);
            }
            count++;
          }
        }
      }
      const mean: RgbTuple = [0, 0, 0];
      for (let channel = 0; channel <= 2; channel++) {
        mean[channel] = unlinearizeRgbChannel(total[channel] / count);
      }
      return new Rgb(...mean);
    }
  }

  public override destroy(): void {
    super.destroy();
    this.events.destroy();
  }
}
