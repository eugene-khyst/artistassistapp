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

import {Rgb} from '~/src/services/color/space/rgb';

export function kelvinToRgb(tmp: number): Rgb {
  tmp = tmp / 100;
  let r, g, b;

  if (tmp <= 66) {
    r = 255;
  } else {
    r = tmp - 60;
    r = 329.698727466 * Math.pow(r, -0.1332047592);
    if (r < 0) {
      r = 0;
    }
    if (r > 255) {
      r = 255;
    }
  }

  if (tmp <= 66) {
    g = tmp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    if (g < 0) {
      g = 0;
    }
    if (g > 255) {
      g = 255;
    }
  } else {
    g = tmp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    if (g < 0) {
      g = 0;
    }
    if (g > 255) {
      g = 255;
    }
  }

  if (tmp >= 66) {
    b = 255;
  } else if (tmp <= 19) {
    b = 0;
  } else {
    b = tmp - 10;
    b = 138.5177312231 * Math.log(b) - 305.0447927307;
    if (b < 0) {
      b = 0;
    }
    if (b > 255) {
      b = 255;
    }
  }

  return new Rgb(r, g, b);
}
