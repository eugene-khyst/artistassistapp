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

import type {RgbTuple} from '~/src/services/color/space/rgb';
import {linearizeRgbChannel, Rgb, unlinearizeRgbChannel} from '~/src/services/color/space/rgb';
import {EventManager} from '~/src/services/event/event-manager';
import {clamp} from '~/src/services/math/clamp';
import type {Vector} from '~/src/services/math/geometry';
import {getRgbaForCoord, imageBitmapToOffscreenCanvas} from '~/src/utils/graphics';

import type {ZoomableImageCanvasProps} from './zoomable-image-canvas';
import {ZoomableImageCanvas} from './zoomable-image-canvas';

export const MIN_COLOR_PICKER_DIAMETER = 1;
export const MAX_COLOR_PICKER_DIAMETER = 100;
const LINE_WIDTH = 2;
const PIPET_OUTLINE_COUNT = 3;
const PIPET_CENTER_DOT_THRESHOLD = 1;

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
  private readonly cursorDiameter: number;
  public readonly events = new EventManager<ColorPickerEventType>();

  constructor(
    canvas: HTMLCanvasElement,
    {imageSmoothingEnabled = false, ...props}: ImageColorPickerCanvasProps = {}
  ) {
    super(canvas, {imageSmoothingEnabled, ...props});

    ({cursorDiameter: this.cursorDiameter = 100} = props);

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
      const [canvas] = imageBitmapToOffscreenCanvas(bitmap, true);
      return canvas;
    });
  }

  protected getOffscreenCanvas(): OffscreenCanvas | null {
    return this.images.length > this.imageIndex ? this.offscreenCanvases[this.imageIndex]! : null;
  }

  private drawCircle(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    center: Vector,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  }

  private drawPipet(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    if (this.pipetPoint) {
      const pipetDiameter = this.lastPipetDiameter;
      const cursorDiameter =
        this.cursorDiameter > pipetDiameter ? this.cursorDiameter : pipetDiameter + 2;
      const lineWidth = LINE_WIDTH / this.zoom;
      ctx.lineWidth = lineWidth;
      const isDark = this.pipetRgb.isDark();
      let isDarkToggle = isDark;
      for (let i = PIPET_OUTLINE_COUNT; i >= 1; i--) {
        ctx.strokeStyle = isDarkToggle ? '#000' : '#fff';
        const size = cursorDiameter + 2 * i * lineWidth;
        ctx.strokeRect(this.pipetPoint.x - size / 2, this.pipetPoint.y - size / 2, size, size);
        isDarkToggle = !isDarkToggle;
      }
      ctx.strokeStyle = ctx.fillStyle = isDark ? '#fff' : '#000';
      this.drawCircle(ctx, this.pipetPoint, pipetDiameter / 2);
      ctx.stroke();
      if (pipetDiameter > PIPET_CENTER_DOT_THRESHOLD) {
        this.drawCircle(ctx, this.pipetPoint, lineWidth);
        ctx.fill();
      }
    }
  }

  protected override onImageDrawn(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.drawPipet(ctx);
  }

  protected override onClickOrTap(point: Vector): void {
    this.setPipetPoint(point);
  }

  setPipetDiameter(pipetDiameter: number): void {
    this.pipetDiameter = clamp(pipetDiameter, MIN_COLOR_PICKER_DIAMETER, MAX_COLOR_PICKER_DIAMETER);
  }

  setPipetPoint(pipetPoint: Vector | null): void {
    if (!pipetPoint || !this.imageContains(pipetPoint, this.pipetDiameter / 2)) {
      this.pipetPoint = null;
      this.requestRedraw();
      return;
    }
    this.pipetPoint = pipetPoint;
    this.lastPipetDiameter = this.pipetDiameter;
    const imagePoint: Vector | undefined = this.toImagePoint(pipetPoint);
    this.pipetRgb = this.getAverageColor(imagePoint) ?? Rgb.WHITE;
    const event: PipetPointSetEvent = {
      point: pipetPoint!,
      diameter: this.lastPipetDiameter,
      rgb: this.pipetRgb,
    };
    this.events.notify(ColorPickerEventType.PipetPointSet, event);
    this.requestRedraw();
  }

  private getAverageColor({x, y}: Vector): Rgb | null {
    const diameter = Math.round(this.pipetDiameter);
    const radius = diameter / 2;
    const canvas = this.getOffscreenCanvas();
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
      return Rgb.fromTuple(data.subarray(0, 3));
    }
    const diameter = Math.trunc(Math.min(width, height));
    const radius = Math.trunc(diameter / 2);
    const radiusSquare = radius ** 2;
    const total: RgbTuple = [0, 0, 0];
    let count = 0;
    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        if ((x - radius) ** 2 + (y - radius) ** 2 <= radiusSquare) {
          const color: Uint8ClampedArray = getRgbaForCoord(data, x, y, width);
          for (let channel = 0; channel < 3; channel++) {
            total[channel]! += linearizeRgbChannel(color[channel]!);
          }
          count++;
        }
      }
    }
    if (count === 0) {
      return Rgb.WHITE;
    }
    const mean: RgbTuple = [0, 0, 0];
    for (let channel = 0; channel < 3; channel++) {
      mean[channel] = unlinearizeRgbChannel(total[channel]! / count);
    }
    return Rgb.fromTuple(mean);
  }

  override destroy(): void {
    super.destroy();
    this.events.destroy();
  }
}
