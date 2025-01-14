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

import {WAVELENGTH_RANGE, wavelengthToColor} from '~/src/services/color/light-spectrum';
import type {RgbTuple} from '~/src/services/color/space/rgb';
import type {TypedArray} from '~/src/utils/array';

import {LineChart} from './line-chart';

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

  addReflectance(
    rho: number[] | TypedArray,
    color: string | RgbTuple = '#fff',
    lineWidth = 2
  ): void {
    this.addSeries({
      xValues: WAVELENGTH_RANGE,
      yValues: rho,
      color,
      lineWidth,
    });
  }
}
