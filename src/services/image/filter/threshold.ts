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
import {imageBitmapToImageData} from '~/src/utils';

export const THRESHOLD_VALUES: number[] = [2 / 3, 1 / 3, 0];

export function thresholdFilter(
  image: ImageBitmap,
  thresholds: [number, number, number]
): ImageBitmap[] {
  const [{data: origData, width, height}, canvas, ctx] = imageBitmapToImageData(image);
  return thresholds.map((_, i) => {
    const data = new Uint8ClampedArray(origData, width, height);
    for (let j = 0; j < data.length; j += 4) {
      const r = origData[j]!;
      const g = origData[j + 1]!;
      const b = origData[j + 2]!;
      const {l} = new Rgb(r, g, b).toOklab();
      let v = 255;
      for (let k = i; k >= 0; k--) {
        if (l <= thresholds[k]!) {
          v = Math.trunc(255 * THRESHOLD_VALUES[k]!);
          data[j] = v;
          data[j + 1] = v;
          data[j + 2] = v;
          data[j + 3] = 255;
          break;
        }
      }
    }
    ctx.putImageData(new ImageData(data, width, height), 0, 0);
    return canvas.transferToImageBitmap();
  });
}
