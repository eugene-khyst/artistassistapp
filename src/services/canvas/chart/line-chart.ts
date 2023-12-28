/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {countFractionDigits} from '../../../utils';
import {Rgb, RgbTuple} from '../../color/model';
import {Vector} from '../../math';
import {Canvas} from '../canvas';

const SPACING = 3;

export interface Series {
  xValues: number[];
  yValues: number[];
  color: string | RgbTuple;
  lineWidth?: number;
}

export class LineChartProps {
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
  private paddingLeft: number;
  private paddingTop: number;
  private paddingBottom: number;
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

    this.draw();
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
    this.draw();
  }

  removeAllSeries(): void {
    this.seriesArray = [];
    this.draw();
  }

  protected draw(): void {
    this.drawBackground();
    this.drawXAxis();
    this.drawYAxis();
    this.seriesArray.forEach(({xValues, yValues, color, lineWidth = 1}: Series) =>
      this.drawSeries(xValues, yValues, color, lineWidth)
    );
  }

  protected drawBackground(): void {
    this.context.fillStyle = this.backgroundColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawXAxis(): void {
    const ctx: CanvasRenderingContext2D = this.context;
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

  private drawYAxis(): void {
    const ctx: CanvasRenderingContext2D = this.context;
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
    xValues: number[],
    yValues: number[],
    color: string | RgbTuple,
    lineWidth: number
  ): void {
    const ctx: CanvasRenderingContext2D = this.context;
    ctx.save();

    ctx.lineWidth = lineWidth;
    const colorHex = Rgb.fromHexOrTuple(color).toHex();
    ctx.strokeStyle = colorHex;
    ctx.fillStyle = colorHex;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';

    const {x: x0, y: y0} = this.transformCoordinates(xValues[0], yValues[0]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);

    for (let i = 1; i < xValues.length; i++) {
      const {x, y} = this.transformCoordinates(xValues[i], yValues[i]);

      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.closePath();

      ctx.beginPath();
      ctx.arc(x, y, lineWidth + 1, 0, 2 * Math.PI, false);
      ctx.fill();
      ctx.closePath();

      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    ctx.restore();
  }
}
