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
import {Vector} from '~/src/services/math/geometry';
import {getRgbaForCoord, imageBitmapToOffscreenCanvas} from '~/src/utils/graphics';

import type {ZoomableImageCanvasProps} from './zoomable-image-canvas';
import {ZoomableImageCanvas} from './zoomable-image-canvas';

export const MIN_COLOR_PICKER_DIAMETER = 1;
export const MAX_COLOR_PICKER_DIAMETER = 100;
const PIPETTE_OUTLINE_COUNT = 3;
const PIPETTE_CENTER_DOT_THRESHOLD = 1;

export enum ColorPickerEventType {
  PipettePointSet = 'pipettepointset',
}

export interface PipettePointSetEvent {
  point: Vector;
  diameter: number;
  rgb: Rgb;
}

export interface ColorPickerSample {
  key: string;
  x: number;
  y: number;
  rgb: RgbTuple;
}

export interface ImageColorPickerCanvasProps extends ZoomableImageCanvasProps {
  indicatorVisible?: boolean;
  lineWidth?: number;
  indicatorDiameter?: number;
  sampleRadius?: number;
  colorPickerImageIndex?: number;
}

export class ImageColorPickerCanvas extends ZoomableImageCanvas {
  private pipetteEnabled = true;
  private pipetteDiameter: number;
  private pipettePoint: Vector | null = null;
  private pipetteRgb: Rgb = Rgb.WHITE;
  private lastPipetteDiameter: number;
  private offscreenCanvases: OffscreenCanvas[] = [];
  private samples: ColorPickerSample[] = [];
  private indicatorVisible: boolean;
  private lineWidth: number;
  private indicatorDiameter: number;
  private sampleRadius: number;
  private colorPickerImageIndex: number;
  public readonly events = new EventManager<ColorPickerEventType>();

  constructor(
    canvas: HTMLCanvasElement,
    {imageSmoothingEnabled = false, ...props}: ImageColorPickerCanvasProps = {}
  ) {
    super(canvas, {imageSmoothingEnabled, ...props});

    ({
      indicatorVisible: this.indicatorVisible = true,
      lineWidth: this.lineWidth = 2,
      indicatorDiameter: this.indicatorDiameter = 100,
      sampleRadius: this.sampleRadius = 10,
      colorPickerImageIndex: this.colorPickerImageIndex = -1,
    } = props);

    this.pipetteDiameter = 1;
    this.lastPipetteDiameter = this.pipetteDiameter;
  }

  protected override getCursor(): string {
    return this.pipetteEnabled ? 'crosshair' : super.getCursor();
  }

  protected override onImagesLoaded(): void {
    this.initOffscreenCanvases();
    this.pipettePoint = null;
  }

  private initOffscreenCanvases(): void {
    this.offscreenCanvases = this.images
      .filter((_, index) => this.colorPickerImageIndex < 0 || this.colorPickerImageIndex === index)
      .map((bitmap: ImageBitmap) => {
        const [canvas] = imageBitmapToOffscreenCanvas(bitmap, true);
        return canvas;
      });
  }

  private getOffscreenCanvas(): OffscreenCanvas | undefined {
    const imageIndex = this.colorPickerImageIndex < 0 ? this.imageIndex : 0;
    return this.offscreenCanvases[imageIndex];
  }

  private drawCircle(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    center: Vector,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  }

  private drawPipette(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    if (this.pipettePoint && this.indicatorVisible) {
      const pipetteDiameter = this.lastPipetteDiameter;
      const cursorDiameter =
        this.indicatorDiameter > pipetteDiameter ? this.indicatorDiameter : pipetteDiameter + 2;
      const lineWidth = this.lineWidth / this.zoom;
      ctx.lineWidth = lineWidth;
      const isDark = this.pipetteRgb.isDark();
      let isDarkToggle = isDark;
      for (let i = PIPETTE_OUTLINE_COUNT; i >= 1; i--) {
        ctx.strokeStyle = isDarkToggle ? '#000' : '#fff';
        const size = cursorDiameter + 2 * i * lineWidth;
        ctx.strokeRect(this.pipettePoint.x - size / 2, this.pipettePoint.y - size / 2, size, size);
        isDarkToggle = !isDarkToggle;
      }
      ctx.strokeStyle = ctx.fillStyle = isDark ? '#fff' : '#000';
      this.drawCircle(ctx, this.pipettePoint, pipetteDiameter / 2);
      ctx.stroke();
      if (pipetteDiameter > PIPETTE_CENTER_DOT_THRESHOLD) {
        this.drawCircle(ctx, this.pipettePoint, lineWidth);
        ctx.fill();
      }
    }
  }

  private drawSamples(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    for (const {x, y, rgb} of this.samples) {
      ctx.lineWidth = this.lineWidth / this.zoom;
      const sampleRgb = Rgb.fromTuple(rgb);
      const isDark = sampleRgb.isDark();
      ctx.strokeStyle = ctx.fillStyle = isDark ? '#fff' : '#000';
      ctx.fillStyle = sampleRgb.toHex(true);
      this.drawCircle(ctx, new Vector(x, y), this.sampleRadius / this.zoom);
      ctx.fill();
      ctx.stroke();
    }
  }

  protected override onImageDrawn(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.drawSamples(ctx);
    this.drawPipette(ctx);
  }

  protected override onClickOrTap(point: Vector): void {
    if (this.pipetteEnabled) {
      this.setPipettePoint(point);
    }
  }

  setPipetteDiameter(pipetteDiameter: number): void {
    this.pipetteDiameter = clamp(
      pipetteDiameter,
      MIN_COLOR_PICKER_DIAMETER,
      MAX_COLOR_PICKER_DIAMETER
    );
  }

  setPipettePoint(pipettePoint: Vector | null): void {
    if (!pipettePoint || !this.imageContains(pipettePoint, this.pipetteDiameter / 2)) {
      this.pipettePoint = null;
      this.requestRedraw();
      return;
    }
    this.pipettePoint = pipettePoint;
    this.lastPipetteDiameter = this.pipetteDiameter;
    const imagePoint: Vector | undefined = this.toImagePoint(pipettePoint);
    this.pipetteRgb = this.getAverageColor(imagePoint) ?? Rgb.WHITE;
    const event: PipettePointSetEvent = {
      point: pipettePoint!,
      diameter: this.lastPipetteDiameter,
      rgb: this.pipetteRgb,
    };
    this.events.notify(ColorPickerEventType.PipettePointSet, event);
    this.requestRedraw();
  }

  private getAverageColor({x, y}: Vector): Rgb | null {
    const diameter = Math.round(this.pipetteDiameter);
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
      return Rgb.fromTuple([...data.subarray(0, 3)] as RgbTuple);
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

  getSamples(): ColorPickerSample[] {
    return this.samples;
  }

  setSamples(samples: ColorPickerSample[]): void {
    this.samples = samples;
    this.requestRedraw();
  }

  getSamplesNearby(x: number, y: number): ColorPickerSample[] {
    const radius = this.sampleRadius / this.zoom;
    const point = new Vector(x, y);
    return this.samples.filter(
      ({x, y}): boolean => new Vector(x, y).subtract(point).length() <= radius
    );
  }

  setPipetteEnabled(pipetteEnabled: boolean): void {
    this.pipetteEnabled = pipetteEnabled;
    this.canvas.style.cursor = this.getCursor();
  }

  override destroy(): void {
    super.destroy();
    this.events.destroy();
  }
}
