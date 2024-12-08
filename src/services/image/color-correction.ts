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

import {
  adjustColors,
  calculatePercentiles,
  sortRgbChannels,
} from '~/src/services/image/filter/adjust-colors';
import {adjustColorsWebGL} from '~/src/services/image/filter/adjust-colors-webgl';
import {createScaledImageBitmap, IMAGE_SIZE, imageBitmapToImageData} from '~/src/utils';

interface Result {
  adjustedImages?: ImageBitmap[];
}

export class ColorCorrection {
  image: ImageBitmap | null = null;
  sortedRgbChannels: Uint8ClampedArray[] = [];

  async setImage(blob: Blob): Promise<void> {
    this.image?.close();
    this.image = await createScaledImageBitmap(blob, IMAGE_SIZE['2K']);
    const [imageData] = imageBitmapToImageData(this.image);
    console.time('sort-rgb-channels');
    this.sortedRgbChannels = sortRgbChannels(imageData);
    console.timeEnd('sort-rgb-channels');
  }

  async getAdjustedImage(
    whitePatchPercentile: number,
    saturation: number
  ): Promise<Result | undefined> {
    if (!this.image || !this.sortedRgbChannels.length) {
      return;
    }
    console.time('color-correction');
    const maxValues = calculatePercentiles(this.sortedRgbChannels, whitePatchPercentile);
    let adjustedImages: ImageBitmap[];
    try {
      adjustedImages = [adjustColorsWebGL(this.image, maxValues, saturation)];
    } catch (e) {
      console.error(e);
      adjustedImages = [adjustColors(this.image, maxValues, saturation)];
    }
    adjustedImages = [...adjustedImages, await createImageBitmap(this.image)];
    console.timeEnd('color-correction');
    return transfer({adjustedImages}, adjustedImages);
  }
}
