/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ZoomableImageCanvas, ZoomableImageCanvasProps} from '.';
import {Rectangle} from '../../math';

const GRID_LINE_WIDTH = 1;

export interface GridCanvasProps extends ZoomableImageCanvasProps {
  gridRows?: number;
  gridCols?: number;
}

export class GridCanvas extends ZoomableImageCanvas {
  private gridRows: number;
  private gridCols: number;

  constructor(canvas: HTMLCanvasElement, props: GridCanvasProps = {}) {
    super(canvas, props);

    ({gridRows: this.gridRows = 4, gridCols: this.gridCols = 4} = props);
  }

  private drawHorizontalLine(yPercent: number): void {
    const {width, height, center}: Rectangle = this.getImageDimension();
    const y: number = yPercent * height;
    const lineWidth = GRID_LINE_WIDTH / this.zoom;
    const ctx: CanvasRenderingContext2D = this.context;
    ctx.lineWidth = lineWidth;
    let isDarkToggle = false;
    for (let i = -1; i <= 1; i++) {
      ctx.strokeStyle = isDarkToggle ? '#000' : '#fff';
      ctx.beginPath();
      ctx.moveTo(-center.x, -center.y + y + i * lineWidth);
      ctx.lineTo(-center.x + width, -center.y + y + i * lineWidth);
      ctx.stroke();
      isDarkToggle = !isDarkToggle;
    }
  }

  private drawVerticalLine(xPercent: number): void {
    const {width, height, center}: Rectangle = this.getImageDimension();
    const x: number = xPercent * width;
    const lineWidth = GRID_LINE_WIDTH / this.zoom;
    const ctx: CanvasRenderingContext2D = this.context;
    ctx.lineWidth = lineWidth;
    let isDarkToggle = false;
    for (let i = -1; i <= 1; i++) {
      ctx.strokeStyle = isDarkToggle ? '#000' : '#fff';
      ctx.beginPath();
      ctx.moveTo(-center.x + x + i * lineWidth, -center.y);
      ctx.lineTo(-center.x + x + i * lineWidth, -center.y + height);
      ctx.stroke();
      isDarkToggle = !isDarkToggle;
    }
  }

  private drawGrid(): void {
    for (let row = 1; row < this.gridRows; row++) {
      this.drawHorizontalLine(row / this.gridRows);
    }
    for (let col = 1; col < this.gridCols; col++) {
      this.drawVerticalLine(col / this.gridCols);
    }
  }

  protected override onImageDrawn(): void {
    this.drawGrid();
  }
}
