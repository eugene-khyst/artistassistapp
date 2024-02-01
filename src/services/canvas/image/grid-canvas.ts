/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ZoomableImageCanvas, ZoomableImageCanvasProps} from '.';
import {Rectangle} from '../../math';

const GRID_LINE_WIDTH = 1;

export enum GridType {
  Rectangular = 1,
  Diagonal = 2,
}

type RectangularGrid = {
  type: GridType.Rectangular;
  rows: number;
  cols: number;
};

type DiagonalGrid = {
  type: GridType.Diagonal;
};

export type Grid = RectangularGrid | DiagonalGrid;

export interface GridCanvasProps extends ZoomableImageCanvasProps {
  grid?: Grid;
}

export class GridCanvas extends ZoomableImageCanvas {
  private grid?: Grid;

  constructor(canvas: HTMLCanvasElement, props: GridCanvasProps = {}) {
    super(canvas, props);

    ({grid: this.grid} = props);
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, xi: number, yi: number): void {
    const {center}: Rectangle = this.getImageDimension();
    const lineWidth = GRID_LINE_WIDTH / this.zoom;
    const ctx: CanvasRenderingContext2D = this.context;
    ctx.lineWidth = lineWidth;
    let isDarkToggle = false;
    for (let i = -1; i <= 1; i++) {
      ctx.strokeStyle = isDarkToggle ? '#000' : '#fff';
      ctx.beginPath();
      ctx.moveTo(-center.x + x1 + xi * i * lineWidth, -center.y + y1 + yi * i * lineWidth);
      ctx.lineTo(-center.x + x2 + xi * i * lineWidth, -center.y + y2 + yi * i * lineWidth);
      ctx.stroke();
      isDarkToggle = !isDarkToggle;
    }
  }

  private drawHorizontalLine(yPercent: number): void {
    const {width, height}: Rectangle = this.getImageDimension();
    const y: number = yPercent * height;
    this.drawLine(0, y, width, y, 0, 1);
  }

  private drawVerticalLine(xPercent: number): void {
    const {width, height}: Rectangle = this.getImageDimension();
    const x: number = xPercent * width;
    this.drawLine(x, 0, x, height, 1, 0);
  }

  private drawRectangularGrid(grid: RectangularGrid): void {
    for (let row = 1; row < grid.rows; row++) {
      this.drawHorizontalLine(row / grid.rows);
    }
    for (let col = 1; col < grid.cols; col++) {
      this.drawVerticalLine(col / grid.cols);
    }
  }

  private drawDiagonalGrid(): void {
    const {width, height}: Rectangle = this.getImageDimension();

    this.drawLine(0, 0, width, height, 1, 0);
    this.drawLine(width, 0, 0, height, 1, 0);

    this.drawHorizontalLine(0.5);
    this.drawVerticalLine(0.5);

    this.drawLine(width / 2, 0, 0, height / 2, 1, 0);
    this.drawLine(width / 2, 0, width, height / 2, 1, 0);

    this.drawLine(0, height / 2, width / 2, height, 1, 0);
    this.drawLine(width, height / 2, width / 2, height, 1, 0);
  }

  private drawGrid(): void {
    if (this.grid?.type === GridType.Rectangular) {
      this.drawRectangularGrid(this.grid);
    } else if (this.grid?.type === GridType.Diagonal) {
      this.drawDiagonalGrid();
    }
  }

  protected override onImageDrawn(): void {
    this.drawGrid();
  }

  setGrid(grid: Grid): void {
    this.grid = grid;
    this.draw();
  }
}
