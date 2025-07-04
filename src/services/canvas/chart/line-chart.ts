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

import {Canvas} from '~/src/services/canvas/canvas';
import type {RgbTuple} from '~/src/services/color/space/rgb';
import {Rgb} from '~/src/services/color/space/rgb';
import {Vector} from '~/src/services/math/geometry';
import type {TypedArray} from '~/src/utils/array';
import {countFractionDigits} from '~/src/utils/format';

const SPACING = 3;

export interface Series {
  xValues: number[] | TypedArray;
  yValues: number[] | TypedArray;
  color: string | RgbTuple;
  lineWidth?: number;
}

export interface LineChartProps {
  backgroundColor?: string;
  fontColor?: string;
  gridlineColor?: string;
  fontSize?: number;
  tickSize?: number;
}

export class LineChart extends Canvas {
  protected seriesArray: Series[] = [];
  protected rangeX: number;
  protected rangeY: number;
  private readonly paddingLeft: number;
  private readonly paddingTop: number;
  private readonly paddingBottom: number;
  protected backgroundColor: string;
  protected fontColor: string;
  protected gridlineColor: string;
  protected fontSize: number;
  protected tickSize: number;

  constructor(
    canvas: HTMLCanvasElement,
    protected minX: number,
    protected maxX: number,
    protected minY: number,
    protected maxY: number,
    protected xGridlinesStep: number,
    protected yGridlinesStep: number,
    protected xAxisLabel: string,
    protected yAxisLabel: string,
    props: LineChartProps = {}
  ) {
    super(canvas);

    this.rangeX = this.maxX - this.minX;
    this.rangeY = this.maxY - this.minY;

    ({
      backgroundColor: this.backgroundColor = '#fff',
      fontColor: this.fontColor = '#000',
      gridlineColor: this.gridlineColor = '#808080',
      fontSize: this.fontSize = 14,
      tickSize: this.tickSize = 7,
    } = props);

    this.paddingTop = this.fontSize / 2 + SPACING;
    this.paddingBottom =
      this.tickSize + SPACING + this.fontSize + 2 * SPACING + this.fontSize + SPACING;

    let longestValueWidth = 0;
    const fractionDigits: number = countFractionDigits(yGridlinesStep);
    for (let i = minY; i <= maxY; i += yGridlinesStep) {
      const label: string = i.toFixed(fractionDigits).toString();
      const {width} = this.context.measureText(label);
      longestValueWidth = Math.max(longestValueWidth, width);
    }
    this.paddingLeft =
      SPACING + this.fontSize + 3 * SPACING + longestValueWidth + SPACING + this.tickSize;

    this.requestRedraw();
  }

  protected get scaleX(): number {
    return (this.canvas.width - this.paddingLeft) / this.rangeX;
  }

  protected get scaleY(): number {
    return (this.canvas.height - this.paddingTop - this.paddingBottom) / this.rangeY;
  }

  protected transformCoordinates(x: number, y: number): Vector {
    return new Vector(
      this.paddingLeft + this.scaleX * (x - this.minX),
      this.paddingTop - this.scaleY * (y - this.maxY)
    );
  }

  private get font(): string {
    return `${this.fontSize}px sans-serif`;
  }

  addSeries(series: Series): void {
    this.seriesArray.push(series);
    this.requestRedraw();
  }

  removeAllSeries(): void {
    this.seriesArray = [];
    this.requestRedraw();
  }

  protected override draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawXAxis(ctx);
    this.drawYAxis(ctx);
    this.seriesArray.forEach(({xValues, yValues, color, lineWidth = 1}: Series) => {
      this.drawSeries(ctx, xValues, yValues, color, lineWidth);
    });
  }

  protected drawBackground(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawXAxis(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.save();

    ctx.strokeStyle = this.gridlineColor;
    ctx.lineWidth = 1;

    for (let i = this.minX; i <= this.maxX; i += this.xGridlinesStep) {
      ctx.beginPath();
      const {x} = this.transformCoordinates(i, 0);
      ctx.moveTo(x, this.paddingTop);
      ctx.lineTo(x, this.canvas.height - this.paddingBottom + this.tickSize);
      ctx.stroke();
    }

    ctx.font = this.font;
    ctx.fillStyle = this.fontColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const fractionDigits: number = countFractionDigits(this.xGridlinesStep);
    for (let i = this.minX; i <= this.maxX; i += this.xGridlinesStep) {
      const label: string = i.toFixed(fractionDigits).toString();
      const {x} = this.transformCoordinates(i, 0);
      ctx.save();
      ctx.translate(x, this.canvas.height - this.paddingBottom + this.tickSize + SPACING);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    ctx.font = `bold ${this.font}`;

    ctx.save();
    ctx.translate(
      this.paddingLeft + (this.canvas.width - this.paddingLeft) / 2,
      this.canvas.height -
        this.paddingBottom +
        this.tickSize +
        SPACING +
        this.fontSize +
        2 * SPACING
    );
    ctx.fillText(this.xAxisLabel, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private drawYAxis(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.save();

    ctx.strokeStyle = this.gridlineColor;
    ctx.lineWidth = 1;

    for (let j = this.minY; j <= this.maxY; j += this.yGridlinesStep) {
      ctx.beginPath();
      const {y} = this.transformCoordinates(0, j);
      ctx.moveTo(this.paddingLeft - this.tickSize, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    ctx.font = this.font;
    ctx.fillStyle = this.fontColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const fractionDigits: number = countFractionDigits(this.yGridlinesStep);
    for (let i = this.minY; i <= this.maxY; i += this.yGridlinesStep) {
      const label: string = i.toFixed(fractionDigits).toString();
      const {y} = this.transformCoordinates(0, i);
      ctx.save();
      ctx.translate(this.paddingLeft - this.tickSize - SPACING, y);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    ctx.font = `bold ${this.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.save();
    ctx.translate(
      SPACING,
      this.paddingTop + (this.canvas.height - this.paddingTop - this.paddingBottom) / 2
    );
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(this.yAxisLabel, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  private drawSeries(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    xValues: number[] | TypedArray,
    yValues: number[] | TypedArray,
    color: string | RgbTuple,
    lineWidth: number
  ): void {
    ctx.save();

    ctx.lineWidth = lineWidth;
    const colorHex = Rgb.fromHexOrTuple(color).toHex();
    ctx.strokeStyle = colorHex;
    ctx.fillStyle = colorHex;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

    const {x: x0, y: y0} = this.transformCoordinates(xValues[0]!, yValues[0]!);
    ctx.beginPath();
    ctx.moveTo(x0, y0);

    for (let i = 1; i < xValues.length; i++) {
      const {x, y} = this.transformCoordinates(xValues[i]!, yValues[i]!);

      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, lineWidth + 1, 0, 2 * Math.PI, false);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    ctx.restore();
  }
}
