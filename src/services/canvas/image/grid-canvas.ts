/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {invertColors} from '~/src/services/image/filter/invert-filter';
import type {Rectangle} from '~/src/services/math';
import {Vector} from '~/src/services/math';
import {IMAGE_SIZE} from '~/src/utils';

import type {ZoomableImageCanvasProps} from './zoomable-image-canvas';
import {ZoomableImageCanvas} from './zoomable-image-canvas';

export enum GridType {
  Square = 1,
  Rectangular = 3,
}

interface Grid {
  type: GridType;
  size: [number] | [number, number];
  diagonals?: boolean;
}

export interface GridCanvasProps extends ZoomableImageCanvasProps {
  grid?: Grid;
  gridLineWidth?: number;
  diagonalLineWidth?: number;
}

export class GridCanvas extends ZoomableImageCanvas {
  private invertedImages: ImageBitmap[] | OffscreenCanvas[] = [];
  private grid?: Grid;
  private gridLineWidth: number;
  private diagonalLineWidth: number;

  constructor(canvas: HTMLCanvasElement, props: GridCanvasProps = {}) {
    super(canvas, props);

    ({
      grid: this.grid,
      gridLineWidth: this.gridLineWidth = 1,
      diagonalLineWidth: this.diagonalLineWidth = 1,
    } = props);
  }

  protected override onImagesLoaded(): void {
    console.time('invert-colors');
    this.invertedImages = this.images.map((image: ImageBitmap): ImageBitmap => {
      return invertColors(image);
    });
    console.timeEnd('invert-colors');
  }

  private drawLine(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    p1: Vector,
    p2: Vector,
    lineWidth?: number
  ): void {
    const {center}: Rectangle = this.getImageDimension();
    ctx.lineWidth = (lineWidth ?? this.diagonalLineWidth) / this.zoom;
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    const {x: x1, y: y1} = p1.subtract(center);
    ctx.moveTo(x1, y1);
    const {x: x2, y: y2} = p2.subtract(center);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  private drawHorizontalLine(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    y: number
  ): void {
    const {width}: Rectangle = this.getImageDimension();
    this.drawLine(ctx, new Vector(0, y), new Vector(width, y), this.gridLineWidth);
  }

  private drawVerticalLine(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number
  ): void {
    const {height}: Rectangle = this.getImageDimension();
    this.drawLine(ctx, new Vector(x, 0), new Vector(x, height), this.gridLineWidth);
  }

  private drawSquareGrid(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    {size: [size]}: Grid
  ): void {
    const {width, height}: Rectangle = this.getImageDimension();
    const side: number = Math.min(width, height) / size;
    for (let y = side; y < height; y += side) {
      this.drawHorizontalLine(ctx, y);
    }
    for (let x = side; x < width; x += side) {
      this.drawVerticalLine(ctx, x);
    }
  }

  private drawRectangularGrid(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    {size: [m, n], diagonals}: Grid
  ): void {
    if (n) {
      const {width, height}: Rectangle = this.getImageDimension();
      const isPortrait = width <= height;
      const [rows, cols] = isPortrait ? [m, n] : [n, m];
      for (let row = 1; row < rows; row++) {
        this.drawHorizontalLine(ctx, (height * row) / rows);
      }
      for (let col = 1; col < cols; col++) {
        this.drawVerticalLine(ctx, (width * col) / cols);
      }
      if (diagonals) {
        const a = new Vector(0, 0);
        const b = new Vector(width / 2, 0);
        const c = new Vector(width, 0);
        const d = new Vector(width, height / 2);
        const e = new Vector(width, height);
        const f = new Vector(width / 2, height);
        const g = new Vector(0, height);
        const h = new Vector(0, height / 2);

        this.drawLine(ctx, a, e);
        this.drawLine(ctx, c, g);

        if (m === 3 && n === 3) {
          if (isPortrait) {
            this.drawLine(ctx, b, f);
            this.drawLine(ctx, d, h);
            this.drawLine(ctx, a, d);
            this.drawLine(ctx, c, h);
            this.drawLine(ctx, d, g);
            this.drawLine(ctx, e, h);
          } else {
            this.drawLine(ctx, b, f);
            this.drawLine(ctx, d, h);
            this.drawLine(ctx, a, f);
            this.drawLine(ctx, b, g);
            this.drawLine(ctx, b, e);
            this.drawLine(ctx, c, f);
          }
        }

        if (m === 4 && n === 4) {
          this.drawLine(ctx, b, h);
          this.drawLine(ctx, b, d);
          this.drawLine(ctx, h, f);
          this.drawLine(ctx, d, f);
        }
      }
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    if (this.grid?.type === GridType.Square) {
      this.drawSquareGrid(ctx, this.grid);
    } else if (this.grid?.type === GridType.Rectangular) {
      this.drawRectangularGrid(ctx, this.grid);
    }
  }

  protected override onBeforeImageDrawn(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.drawGrid(ctx);
    ctx.globalCompositeOperation = 'source-in';
    this.drawImage(ctx, this.invertedImages);
    ctx.globalCompositeOperation = 'destination-over';
  }

  protected override onImageDrawn(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.drawGrid(ctx);
    ctx.globalCompositeOperation = 'source-over';
  }

  setGrid(grid: Grid): void {
    this.grid = grid;
    this.draw();
  }

  override async convertToBlob(): Promise<Blob | undefined> {
    const image: ImageBitmap | OffscreenCanvas | null = this.getImage();
    if (image) {
      const {width, height} = image;
      const scale: number = Math.max(1, (width * height) / IMAGE_SIZE.HD);
      const {gridLineWidth, diagonalLineWidth} = this;
      try {
        this.gridLineWidth = scale * gridLineWidth;
        this.diagonalLineWidth = scale * diagonalLineWidth;
        return await super.convertToBlob();
      } finally {
        this.gridLineWidth = gridLineWidth;
        this.diagonalLineWidth = diagonalLineWidth;
      }
    }
    return;
  }
}
