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

import {linearizeRgbChannel} from '~/src/services/color/space/rgb';
import {
  createImageBitmapResizedTotalPixels,
  IMAGE_SIZE,
  imageBitmapToImageData,
} from '~/src/utils/graphics';

function sortRgbChannels(imageData: ImageData): Uint8ClampedArray[] {
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

export class RgbChannelsPercentileCalculator {
  sortedRgbChannels: Uint8ClampedArray[] = [];

  async setImage(blob: Blob): Promise<void> {
    const image: ImageBitmap = await createImageBitmapResizedTotalPixels(blob, IMAGE_SIZE['2K']);
    const [imageData] = imageBitmapToImageData(image);
    image.close();
    console.time('sort-rgb-channels');
    this.sortedRgbChannels = sortRgbChannels(imageData);
    console.timeEnd('sort-rgb-channels');
  }

  calculatePercentiles(percentile: number): number[] {
    return this.sortedRgbChannels.map(channel => {
      const index = Math.floor(percentile * channel.length) - 1;
      return linearizeRgbChannel(channel[Math.max(0, index)]!);
    });
  }
}
