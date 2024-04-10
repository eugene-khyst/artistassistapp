/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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
            const value = origData[index];
            if (value < min[c]) {
              min[c] = value;
            }
          }
        }
      }
      for (let c = 0; c < 3; c++) {
        const index = getIndexForCoord(x, y, width, c);
        data[index] = min[c];
      }
    }
  }
}
