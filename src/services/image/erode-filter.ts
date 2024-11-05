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

import {getIndexForCoord} from '~/src/utils';

export function erodeFilter({data, width, height}: ImageData, radius: number): void {
  if (radius < 1) {
    return;
  }
  const origData = new Uint8ClampedArray(data);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const min = [255, 255, 255];
      for (let j = -radius; j <= radius; j++) {
        for (let i = -radius; i <= radius; i++) {
          for (let c = 0; c < 3; c++) {
            const index = getIndexForCoord(x + i, y + j, width, c);
            const value = origData[index]!;
            if (value < min[c]!) {
              min[c] = value;
            }
          }
        }
      }
      for (let c = 0; c < 3; c++) {
        const index = getIndexForCoord(x, y, width, c);
        data[index] = min[c]!;
      }
    }
  }
}
