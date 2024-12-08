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

import {linearizeRgbChannel, unlinearizeRgbChannel} from '~/src/services/color/space';
import {imageBitmapToImageData} from '~/src/utils';

export function sortRgbChannels(imageData: ImageData): Uint8ClampedArray[] {
  const {data} = imageData;
  const length = Math.ceil(data.length / 4);
  const channels = Array.from({length: 3}, () => new Uint8ClampedArray(length));
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    for (let channel = 0; channel < 3; channel++) {
      channels[channel]![j] = data[i + channel]!;
    }
  }
  channels.forEach(channel => channel.sort());
  return channels;
}

export function calculatePercentiles(
  sortedRgbChannels: Uint8ClampedArray[],
  percentile: number
): number[] {
  return sortedRgbChannels.map(channel => {
    const index = Math.floor(percentile * channel.length) - 1;
    return linearizeRgbChannel(channel[Math.max(0, index)]!);
  });
}

export function adjustColors(
  image: ImageBitmap,
  maxValues: number[] = [1, 1, 1],
  saturation = 1
): ImageBitmap {
  const [imageData, canvas, ctx] = imageBitmapToImageData(image);
  const {data} = imageData;
  for (let i = 0; i < data.length; i += 4) {
    let r = linearizeRgbChannel(data[i]!);
    let g = linearizeRgbChannel(data[i + 1]!);
    let b = linearizeRgbChannel(data[i + 2]!);

    r = Math.min(r / maxValues[0]!, 1);
    g = Math.min(g / maxValues[1]!, 1);
    b = Math.min(b / maxValues[2]!, 1);

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    r = r + (luminance - r) * (1 - saturation);
    g = g + (luminance - g) * (1 - saturation);
    b = b + (luminance - b) * (1 - saturation);

    data[i] = unlinearizeRgbChannel(r);
    data[i + 1] = unlinearizeRgbChannel(g);
    data[i + 2] = unlinearizeRgbChannel(b);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.transferToImageBitmap();
}
