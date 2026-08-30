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

import {
  clamp,
  isRgbDark,
  linearizeRgbChannel,
  rgbToHex,
  type RgbTuple,
  unlinearizeRgbChannel,
  WHITE,
} from '@eugene-khyst/artistassistapp-color-mixer';

import {EventManager} from '@/services/event/event-manager';
import {Rectangle, Vector} from '@/services/math/geometry';
import {type DrawImageSource, drawImageToOffscreenCanvas, getRgbaForCoord} from '@/utils/graphics';

import {BaseCanvasMode, type CanvasPointer, type ImageCanvasRenderingContext} from './canvas-mode';

export const MIN_COLOR_PICKER_DIAMETER = 1;
export const MAX_COLOR_PICKER_DIAMETER = 100;
const PIPETTE_OUTLINE_COUNT = 3;
const PIPETTE_CENTER_DOT_THRESHOLD = 1;

export enum ImageColorPickerEventType {
  PipettePointSet = 'PipettePointSet',
}

export interface PipettePointSetEvent extends CanvasPointer {
  diameter: number;
  rgb: RgbTuple;
}

export interface ColorPickerSample {
  key: string;
  imageCenteredPoint: Vector;
  rgb: RgbTuple;
}

export interface ImageColorPickerModeProps {
  indicatorVisible?: boolean;
  lineWidth?: number;
  indicatorDiameter?: number;
  sampleRadius?: number;
  colorPickerImageIndex?: number;
}

export class ImageColorPickerMode extends BaseCanvasMode {
  private pipetteDiameter = 1;
  private pipetteImageCenteredPoint: Vector | null = null;
  private pipetteRgb: RgbTuple = WHITE;
  private lastPipetteDiameter = this.pipetteDiameter;
  private offscreenCanvases: OffscreenCanvas[] = [];
  private samples: ColorPickerSample[] = [];
  private readonly indicatorVisible: boolean;
  private readonly lineWidth: number;
  private readonly indicatorDiameter: number;
  private readonly sampleRadius: number;
  private readonly colorPickerImageIndex: number;
  private overlayImage: ImageBitmap | null = null;
  private overlayImageDimension = Rectangle.ZERO;
  readonly events = new EventManager();

  constructor({
    indicatorVisible = true,
    lineWidth = 2,
    indicatorDiameter = 100,
    sampleRadius = 10,
    colorPickerImageIndex = -1,
  }: ImageColorPickerModeProps = {}) {
    super();
    this.indicatorVisible = indicatorVisible;
    this.lineWidth = lineWidth;
    this.indicatorDiameter = indicatorDiameter;
    this.sampleRadius = sampleRadius;
    this.colorPickerImageIndex = colorPickerImageIndex;
  }

  getCursor(): string {
    return 'crosshair';
  }

  setOverlayImage(image: ImageBitmap | null): void {
    this.overlayImage = image;
    this.overlayImageDimension = image
      ? new Rectangle(new Vector(image.width, image.height))
      : Rectangle.ZERO;
    this.context?.requestRedraw();
  }

  getImage(image: DrawImageSource | null): DrawImageSource | null {
    return this.overlayImage ?? image;
  }

  getImageDimension(dimension: Rectangle): Rectangle {
    return this.overlayImage ? this.overlayImageDimension : dimension;
  }

  onImagesLoaded(): void {
    this.offscreenCanvases =
      this.context
        ?.getImages()
        .filter(
          (_, index) => this.colorPickerImageIndex < 0 || this.colorPickerImageIndex === index
        )
        .map(
          image =>
            drawImageToOffscreenCanvas(image, {
              willReadFrequently: true,
              fillStyle: '#fff',
            })[0]
        ) ?? [];
    this.pipetteImageCenteredPoint = null;
  }

  private getOffscreenCanvas(): OffscreenCanvas | undefined {
    const imageIndex = this.colorPickerImageIndex < 0 ? (this.context?.getImageIndex() ?? 0) : 0;
    return this.offscreenCanvases[imageIndex];
  }

  private drawCircle(ctx: ImageCanvasRenderingContext, center: Vector, radius: number): void {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);
  }

  private drawPipette(ctx: ImageCanvasRenderingContext): void {
    if (!this.pipetteImageCenteredPoint || !this.indicatorVisible) {
      return;
    }
    const zoom = this.context?.getZoom() ?? 1;
    const pipetteDiameter = this.lastPipetteDiameter;
    const cursorDiameter =
      this.indicatorDiameter > pipetteDiameter ? this.indicatorDiameter : pipetteDiameter + 2;
    const lineWidth = this.lineWidth / zoom;
    ctx.lineWidth = lineWidth;
    const isDark = isRgbDark(...this.pipetteRgb);
    let isDarkToggle = isDark;
    for (let i = PIPETTE_OUTLINE_COUNT; i >= 1; i--) {
      ctx.strokeStyle = isDarkToggle ? '#000' : '#fff';
      const size = cursorDiameter + 2 * i * lineWidth;
      ctx.strokeRect(
        this.pipetteImageCenteredPoint.x - size / 2,
        this.pipetteImageCenteredPoint.y - size / 2,
        size,
        size
      );
      isDarkToggle = !isDarkToggle;
    }
    ctx.strokeStyle = ctx.fillStyle = isDark ? '#fff' : '#000';
    this.drawCircle(ctx, this.pipetteImageCenteredPoint, pipetteDiameter / 2);
    ctx.stroke();
    if (pipetteDiameter > PIPETTE_CENTER_DOT_THRESHOLD) {
      this.drawCircle(ctx, this.pipetteImageCenteredPoint, lineWidth);
      ctx.fill();
    }
  }

  private drawSamples(ctx: ImageCanvasRenderingContext): void {
    const zoom = this.context?.getZoom() ?? 1;
    for (const {imageCenteredPoint, rgb} of this.samples) {
      ctx.lineWidth = this.lineWidth / zoom;
      const isDark = isRgbDark(...rgb);
      ctx.strokeStyle = isDark ? '#fff' : '#000';
      ctx.fillStyle = rgbToHex(...rgb);
      this.drawCircle(ctx, imageCenteredPoint, this.sampleRadius / zoom);
      ctx.fill();
      ctx.stroke();
    }
  }

  onImageDrawn(ctx: ImageCanvasRenderingContext): void {
    this.drawSamples(ctx);
    this.drawPipette(ctx);
  }

  onClickOrTap(pointer: CanvasPointer): boolean {
    this.setPipettePoint(pointer);
    return true;
  }

  setPipetteDiameter(pipetteDiameter: number): void {
    this.pipetteDiameter = clamp(
      pipetteDiameter,
      MIN_COLOR_PICKER_DIAMETER,
      MAX_COLOR_PICKER_DIAMETER
    );
  }

  setPipettePoint(pointer: CanvasPointer | null): void {
    if (!pointer) {
      this.clearPipettePoint();
      return;
    }
    if (!this.trySetPipettePoint(pointer)) {
      return;
    }
    this.notifyPipettePointSet(pointer);
  }

  private notifyPipettePointSet(pointer: CanvasPointer): void {
    const event: PipettePointSetEvent = {
      ...pointer,
      diameter: this.lastPipetteDiameter,
      rgb: this.pipetteRgb,
    };
    this.events.notify(ImageColorPickerEventType.PipettePointSet, event);
  }

  private clearPipettePoint(): void {
    this.pipetteImageCenteredPoint = null;
    this.context?.requestRedraw();
  }

  private trySetPipettePoint({imageCenteredPoint, imagePoint}: CanvasPointer): boolean {
    if (!this.imageDimension().contains(imagePoint, this.pipetteDiameter / 2)) {
      this.clearPipettePoint();
      return false;
    }
    this.pipetteImageCenteredPoint = imageCenteredPoint;
    this.lastPipetteDiameter = this.pipetteDiameter;
    this.pipetteRgb = this.getAverageColor(imagePoint) ?? WHITE;
    this.context?.requestRedraw();
    return true;
  }

  private getAverageColor({x, y}: Vector): RgbTuple | null {
    const diameter = Math.round(this.pipetteDiameter);
    const radius = diameter / 2;
    const canvas = this.getOffscreenCanvas();
    if (!canvas) {
      return null;
    }
    const imageData = canvas
      .getContext('2d')!
      .getImageData(Math.round(x - radius), Math.round(y - radius), diameter, diameter);
    return this.getAverageColorFromImageData(imageData);
  }

  private getAverageColorFromImageData({data, width, height}: ImageData): RgbTuple {
    if (data.length <= 4) {
      return [data[0]!, data[1]!, data[2]!];
    }
    const diameter = Math.trunc(Math.min(width, height));
    const radius = Math.trunc(diameter / 2);
    const radiusSquare = radius ** 2;
    const total = [0, 0, 0];
    let count = 0;
    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        if ((x - radius) ** 2 + (y - radius) ** 2 <= radiusSquare) {
          const color = getRgbaForCoord(data, x, y, width);
          for (let channel = 0; channel < 3; channel++) {
            total[channel]! += linearizeRgbChannel(color[channel]!);
          }
          count++;
        }
      }
    }
    if (count === 0) {
      return WHITE;
    }
    const [totalR, totalG, totalB] = total;
    return [
      unlinearizeRgbChannel(totalR! / count),
      unlinearizeRgbChannel(totalG! / count),
      unlinearizeRgbChannel(totalB! / count),
    ];
  }

  getSamples(): ColorPickerSample[] {
    return this.samples;
  }

  setSamples(samples: ColorPickerSample[]): void {
    this.samples = samples;
    this.context?.requestRedraw();
  }

  getSamplesNearby(imageCenteredPoint: Vector): ColorPickerSample[] {
    const radius = this.sampleRadius / (this.context?.getZoom() ?? 1);
    return this.samples.filter(
      sample => sample.imageCenteredPoint.subtract(imageCenteredPoint).length() <= radius
    );
  }

  override destroy(): void {
    this.events.destroy();
    this.offscreenCanvases = [];
    super.destroy();
  }
}
