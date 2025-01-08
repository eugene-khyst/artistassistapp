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

import {Rgb} from './space';

export const WAVELENGTH_RANGE = new Uint16Array(36).map((_, i) => 380 + 10 * i);

const GAMMA = 0.8;
const MAX_INTENSITY = 255;

export function wavelengthToColor(wavelength: number): Rgb {
  let red, green, blue, factor;
  if (wavelength >= 380 && wavelength < 440) {
    red = -(wavelength - 440) / (440 - 380);
    green = 0.0;
    blue = 1.0;
  } else if (wavelength >= 440 && wavelength < 490) {
    red = 0.0;
    green = (wavelength - 440) / (490 - 440);
    blue = 1.0;
  } else if (wavelength >= 490 && wavelength < 510) {
    red = 0.0;
    green = 1.0;
    blue = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    red = (wavelength - 510) / (580 - 510);
    green = 1.0;
    blue = 0.0;
  } else if (wavelength >= 580 && wavelength < 645) {
    red = 1.0;
    green = -(wavelength - 645) / (645 - 580);
    blue = 0.0;
  } else if (wavelength >= 645 && wavelength < 781) {
    red = 1.0;
    green = 0.0;
    blue = 0.0;
  } else {
    red = 0.0;
    green = 0.0;
    blue = 0.0;
  }
  // Let the intensity fall off near the vision limits
  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.3 + (0.7 * (wavelength - 380)) / (420 - 380);
  } else if (wavelength >= 420 && wavelength < 701) {
    factor = 1.0;
  } else if (wavelength >= 701 && wavelength < 781) {
    factor = 0.3 + (0.7 * (780 - wavelength)) / (780 - 700);
  } else {
    factor = 0.0;
  }
  if (red !== 0) {
    red = Math.round(MAX_INTENSITY * Math.pow(red * factor, GAMMA));
  }
  if (green !== 0) {
    green = Math.round(MAX_INTENSITY * Math.pow(green * factor, GAMMA));
  }
  if (blue !== 0) {
    blue = Math.round(MAX_INTENSITY * Math.pow(blue * factor, GAMMA));
  }
  return new Rgb(red, green, blue);
}
