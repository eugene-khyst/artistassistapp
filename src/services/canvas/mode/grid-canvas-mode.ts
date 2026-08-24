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

import {Vector} from '@/services/math/geometry';

import type {ImageCanvasRenderingContext} from './canvas-mode';
import {
  CanvasOverlayDrawingMode,
  type CanvasOverlayDrawingModeProps,
} from './canvas-overlay-drawing-mode';

export enum GridType {
  Square = 1,
  Rectangular = 2,
}

interface SquareGrid {
  type: GridType.Square;
  size: number;
}

interface RectangularGrid {
  type: GridType.Rectangular;
  size: [number, number];
  diagonals: boolean;
}

export type Grid = SquareGrid | RectangularGrid;

export interface GridCanvasModeProps extends CanvasOverlayDrawingModeProps {
  grid?: Grid;
}

export class GridCanvasMode extends CanvasOverlayDrawingMode {
  private grid?: Grid | null;

  constructor({grid, ...props}: GridCanvasModeProps = {}) {
    super(props);
    this.grid = grid;
  }

  private drawHorizontalLine(ctx: ImageCanvasRenderingContext, y: number): void {
    const {width} = this.imageDimension();
    this.drawLine(ctx, new Vector(0, y), new Vector(width, y));
  }

  private drawVerticalLine(ctx: ImageCanvasRenderingContext, x: number): void {
    const {height} = this.imageDimension();
    this.drawLine(ctx, new Vector(x, 0), new Vector(x, height));
  }

  private drawSquareGrid(ctx: ImageCanvasRenderingContext, {size}: SquareGrid): void {
    const {width, height} = this.imageDimension();
    const side = Math.min(width, height) / size;
    for (let y = side; y < height; y += side) {
      this.drawHorizontalLine(ctx, y);
    }
    for (let x = side; x < width; x += side) {
      this.drawVerticalLine(ctx, x);
    }
  }

  private drawRectangularGrid(
    ctx: ImageCanvasRenderingContext,
    {size: [m, n], diagonals}: RectangularGrid
  ): void {
    if (!n) {
      return;
    }
    const {width, height} = this.imageDimension();
    const isPortrait = width <= height;
    const [rows, cols] = isPortrait ? [m, n] : [n, m];
    for (let row = 1; row < rows; row++) {
      this.drawHorizontalLine(ctx, (height * row) / rows);
    }
    for (let col = 1; col < cols; col++) {
      this.drawVerticalLine(ctx, (width * col) / cols);
    }
    if (!diagonals) {
      return;
    }
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
      this.drawLine(ctx, b, f);
      this.drawLine(ctx, d, h);
      if (isPortrait) {
        this.drawLine(ctx, a, d);
        this.drawLine(ctx, c, h);
        this.drawLine(ctx, d, g);
        this.drawLine(ctx, e, h);
      } else {
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

  private drawGrid(ctx: ImageCanvasRenderingContext): void {
    if (this.grid?.type === GridType.Square) {
      this.drawSquareGrid(ctx, this.grid);
    } else if (this.grid?.type === GridType.Rectangular) {
      this.drawRectangularGrid(ctx, this.grid);
    }
  }

  protected override drawOverlay(ctx: ImageCanvasRenderingContext): void {
    const {center} = this.imageDimension();
    ctx.save();
    ctx.translate(-center.x, -center.y);
    this.drawGrid(ctx);
    ctx.restore();
  }

  setGrid(grid: Grid | null): void {
    this.grid = grid;
    this.context?.requestRedraw();
  }
}
