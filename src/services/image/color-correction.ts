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

import {transfer} from 'comlink';

import {linearizeRgbChannel, unlinearizeRgbChannel} from '~/src/services/color/space';
import {createScaledImageBitmap, IMAGE_SIZE, imageBitmapToOffscreenCanvas} from '~/src/utils';

interface Result {
  adjustedImages: ImageBitmap[];
}

export class ColorCorrection {
  async getAdjustedImage(
    blob: Blob,
    whitePatchPercentile: number,
    saturation: number
  ): Promise<Result> {
    console.time('color-correction');
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE['2K']);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    adjustColors(imageData, whitePatchPercentile, saturation);
    const adjustedImages: ImageBitmap[] = [await createImageBitmap(imageData), image];
    console.timeEnd('color-correction');
    return transfer({adjustedImages}, adjustedImages);
  }
}

export function adjustColors({data}: ImageData, percentile = 0.95, saturation = 1): void {
  const channels: [number[], number[], number[]] = [[], [], []];
  for (let i = 0; i < data.length; i += 4) {
    channels[0].push(linearizeRgbChannel(data[i]!));
    channels[1].push(linearizeRgbChannel(data[i + 1]!));
    channels[2].push(linearizeRgbChannel(data[i + 2]!));
  }
  const maxValues = channels.map(channel => {
    channel.sort((a: number, b: number) => a - b);
    const index = Math.floor(percentile * channel.length) - 1;
    return channel[Math.max(0, index)];
  });
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
}
