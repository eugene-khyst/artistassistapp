/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ZoomableImageCanvas, ZoomableImageCanvasProps} from '.';
import {imageBitmapToImageData} from '../../../utils';
import {Rgb} from '../../color/model';
import {EventManager} from '../../event';
import {getAverageColor} from '../../image';
import {Vector, Rectangle, clamp} from '../../math';

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
    this.pipetPoint = null;
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

  setPipetDiameter(pipetDiameter: number): void {
    this.pipetDiameter = clamp(pipetDiameter, MIN_COLOR_PICKER_DIAMETER, MAX_COLOR_PICKER_DIAMETER);
  }

  async setPipetPoint(pipetPoint: Vector): Promise<void> {
    const imageDimension: Rectangle = this.getImageDimension();
    const point = pipetPoint.add(imageDimension.center);
    if (imageDimension.contains(point, this.pipetDiameter / 2)) {
      this.pipetPoint = pipetPoint;
      this.pipetRgb = (await this.getAverageRgb(point)) ?? Rgb.WHITE;
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

  private async getAverageRgb({x, y}: Vector): Promise<Rgb | null> {
    const image: ImageBitmap | null = this.getImage();
    if (!image) {
      return null;
    }
    const diameter = Math.round(this.pipetDiameter);
    const radius = diameter / 2;
    const imageArea = await createImageBitmap(
      image,
      Math.round(x - radius),
      Math.round(y - radius),
      diameter,
      diameter
    );
    const imageData = imageBitmapToImageData(imageArea);
    imageArea.close();
    return getAverageColor(imageData);
  }

  public override destroy(): void {
    super.destroy();
    this.events.destroy();
  }
}
