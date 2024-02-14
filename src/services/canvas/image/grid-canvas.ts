/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ZoomableImageCanvas, ZoomableImageCanvasProps} from '.';
import {Rectangle, Vector} from '../../math';

const GRID_LINE_WIDTH = 1;
const GRID_COLOR = '#f00';
const DIAGONAL_LINE_WIDTH = 1;
const DIAGONAL_COLOR = '#ff0';

export enum GridType {
  Square = 1,
  Rectangular = 3,
}

type Grid = {
  type: GridType;
  size: [number] | [number, number];
  diagonals?: boolean;
};

export interface GridCanvasProps extends ZoomableImageCanvasProps {
  grid?: Grid;
}

export class GridCanvas extends ZoomableImageCanvas {
  private grid?: Grid;

  constructor(canvas: HTMLCanvasElement, props: GridCanvasProps = {}) {
    super(canvas, props);

    ({grid: this.grid} = props);
  }

  private drawLine(
    p1: Vector,
    p2: Vector,
    lineWidth: number = DIAGONAL_LINE_WIDTH,
    color = DIAGONAL_COLOR
  ): void {
    const {center}: Rectangle = this.getImageDimension();
    const ctx: CanvasRenderingContext2D = this.context;
    ctx.lineWidth = lineWidth / this.zoom;
    ctx.strokeStyle = color;
    ctx.beginPath();
    const {x: x1, y: y1} = p1.subtract(center);
    ctx.moveTo(x1, y1);
    const {x: x2, y: y2} = p2.subtract(center);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  private drawHorizontalLine(y: number): void {
    const {width}: Rectangle = this.getImageDimension();
    this.drawLine(new Vector(0, y), new Vector(width, y), GRID_LINE_WIDTH, GRID_COLOR);
  }

  private drawVerticalLine(x: number): void {
    const {height}: Rectangle = this.getImageDimension();
    this.drawLine(new Vector(x, 0), new Vector(x, height), GRID_LINE_WIDTH, GRID_COLOR);
  }

  private drawSquareGrid({size: [size]}: Grid): void {
    const {width, height}: Rectangle = this.getImageDimension();
    const side: number = Math.min(width, height) / size;
    for (let y = side; y < height; y += side) {
      this.drawHorizontalLine(y);
    }
    for (let x = side; x < width; x += side) {
      this.drawVerticalLine(x);
    }
  }

  private drawRectangularGrid({size: [m, n], diagonals}: Grid): void {
    if (n) {
      const {width, height}: Rectangle = this.getImageDimension();
      const isPortrait = width <= height;
      const [rows, cols] = isPortrait ? [m, n] : [n, m];
      for (let row = 1; row < rows; row++) {
        this.drawHorizontalLine((height * row) / rows);
      }
      for (let col = 1; col < cols; col++) {
        this.drawVerticalLine((width * col) / cols);
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

        this.drawLine(a, e);
        this.drawLine(c, g);

        if (m === 3 && n === 3) {
          if (isPortrait) {
            this.drawLine(b, f);
            this.drawLine(d, h);
            this.drawLine(a, d);
            this.drawLine(c, h);
            this.drawLine(d, g);
            this.drawLine(e, h);
          } else {
            this.drawLine(b, f);
            this.drawLine(d, h);
            this.drawLine(a, f);
            this.drawLine(b, g);
            this.drawLine(b, e);
            this.drawLine(c, f);
          }
        }

        if (m === 4 && n === 4) {
          this.drawLine(b, h);
          this.drawLine(b, d);
          this.drawLine(h, f);
          this.drawLine(d, f);
        }
      }
    }
  }

  private drawGrid(): void {
    if (this.grid?.type === GridType.Square) {
      this.drawSquareGrid(this.grid);
    } else if (this.grid?.type === GridType.Rectangular) {
      this.drawRectangularGrid(this.grid);
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
