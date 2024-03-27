/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {LineChart} from '.';
import {RgbTuple, WAVELENGTH_RANGE} from '~/src/services/color/model';
import {wavelengthToColor} from '~/src/services/color/model/light-spectrum';

export class ReflectanceChart extends LineChart {
  constructor(canvas: HTMLCanvasElement) {
    super(canvas, 380, 730, 0, 1, 20, 0.1, 'Wavelength (nm)', 'Reflectance', {
      gridlineColor: '#232323',
    });
  }

  protected override drawBackground(): void {
    super.drawBackground();
    const {y: y0} = this.transformCoordinates(0, this.minY);
    const {y: y1} = this.transformCoordinates(0, this.maxY);
    const height = y1 - y0;
    const sx = this.scaleX;
    for (let wavelength = this.minX; wavelength < this.maxX; wavelength += 1) {
      const {x: x0} = this.transformCoordinates(wavelength, 0);
      this.context.fillStyle = wavelengthToColor(wavelength).toHex();
      this.context.fillRect(x0, y0, 2 * sx, height);
    }
  }

  addReflectance(rho: number[], color: string | RgbTuple = '#fff', lineWidth = 2): void {
    this.addSeries({
      xValues: WAVELENGTH_RANGE,
      yValues: rho,
      color,
      lineWidth,
    });
  }
}
