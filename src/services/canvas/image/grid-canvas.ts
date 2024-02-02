/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ZoomableImageCanvas, ZoomableImageCanvasProps} from '.';
import {Rectangle, Vector} from '../../math';

const GRID_LINE_WIDTH = 1;

export enum GridType {
  Square = 1,
  Diagonal = 2,
}

type Grid = {
  type: GridType;
  size: number;
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

  private drawLine(p1: Vector, p2: Vector): void {
    const {width, height, center}: Rectangle = this.getImageDimension();
    const lineWidth = GRID_LINE_WIDTH / this.zoom;
    const ctx: CanvasRenderingContext2D = this.context;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    const {x: x1, y: y1} = p1.subtract(center);
    ctx.moveTo(x1, y1);
    const {x: x2, y: y2} = p2.subtract(center);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    const dashLength: number = Math.max(Math.min(width, height) / 100, 10);
    ctx.setLineDash([dashLength, dashLength]);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }

  private drawHorizontalLine(y: number): void {
    const {width}: Rectangle = this.getImageDimension();
    this.drawLine(new Vector(0, y), new Vector(width, y));
  }

  private drawVerticalLine(x: number): void {
    const {height}: Rectangle = this.getImageDimension();
    this.drawLine(new Vector(x, 0), new Vector(x, height));
  }

  private drawSquareGrid({size}: Grid): void {
    const {width, height}: Rectangle = this.getImageDimension();
    const side: number = Math.min(width, height) / size;
    for (let y = side; y < height; y += side) {
      this.drawHorizontalLine(y);
    }
    for (let x = side; x < width; x += side) {
      this.drawVerticalLine(x);
    }
  }

  private drawDiagonalGrid({size}: Grid): void {
    const {width, height}: Rectangle = this.getImageDimension();

    const a = new Vector(0, 0);
    const b = new Vector(width / 2, 0);
    const c = new Vector(width, 0);
    const d = new Vector(width, height / 2);
    const e = new Vector(width, height);
    const f = new Vector(width / 2, height);
    const g = new Vector(0, height);
    const h = new Vector(0, height / 2);

    if (size >= 4) {
      this.drawLine(a, e);
      this.drawLine(c, g);

      this.drawHorizontalLine(height / 2);
      this.drawVerticalLine(width / 2);
    }

    if (size >= 8) {
      this.drawLine(b, h);
      this.drawLine(b, d);
      this.drawLine(h, f);
      this.drawLine(d, f);
    }

    if (size >= 16) {
      this.drawLine(a, f);
      this.drawLine(a, d);
      this.drawLine(b, g);
      this.drawLine(b, e);
      this.drawLine(c, h);
      this.drawLine(c, f);
      this.drawLine(d, g);
      this.drawLine(e, h);
    }
  }

  private drawGrid(): void {
    if (this.grid?.type === GridType.Square) {
      this.drawSquareGrid(this.grid);
    } else if (this.grid?.type === GridType.Diagonal) {
      this.drawDiagonalGrid(this.grid);
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
