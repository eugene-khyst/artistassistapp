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

import {Rgb} from '~/src/services/color/space';
import {clamp} from '~/src/services/math';

const G_X_KERNEL = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const G_Y_KERNEL = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

export function sobelEdgeDetection({data, width, height}: ImageData): void {
  const origData = new Uint8ClampedArray(data);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0;
      let gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const weightX = G_X_KERNEL[(ky + 1) * 3 + (kx + 1)]!;
          const weightY = G_Y_KERNEL[(ky + 1) * 3 + (kx + 1)]!;

          const r = origData[(y + ky) * width * 4 + (x + kx) * 4]!;
          const g = origData[(y + ky) * width * 4 + (x + kx) * 4 + 1]!;
          const b = origData[(y + ky) * width * 4 + (x + kx) * 4 + 2]!;
          const {l} = new Rgb(r, g, b).toOklab();
          const value = 255 * l;

          gx += weightX * value;
          gy += weightY * value;
        }
      }
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const value = 255 - clamp(magnitude, 0, 255);
      data[y * width * 4 + x * 4] = value;
      data[y * width * 4 + x * 4 + 1] = value;
      data[y * width * 4 + x * 4 + 2] = value;
      data[y * width * 4 + x * 4 + 3] = 255;
    }
  }
}
