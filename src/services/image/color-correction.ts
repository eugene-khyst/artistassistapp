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
  adjustedImage: ImageBitmap | null;
}

export class ColorCorrection {
  image: ImageBitmap | null = null;
  sortedRgbChannels: Uint8ClampedArray[] = [];

  async setImage(blob: Blob): Promise<ImageBitmap> {
    this.image = await createScaledImageBitmap(blob, IMAGE_SIZE['2K']);
    const [imageData] = imageBitmapToImageData(this.image);
    console.time('sort-rgb-channels');
    this.sortedRgbChannels = sortRgbChannels(imageData);
    console.timeEnd('sort-rgb-channels');
    return this.image;
  }

  getAdjustedImage(whitePatchPercentile: number, saturation: number): Result {
    if (!this.image || !this.sortedRgbChannels.length) {
      return {adjustedImage: null};
    }
    console.time('color-correction');
    const maxValues = calculatePercentiles(this.sortedRgbChannels, whitePatchPercentile);
    let adjustedImage: ImageBitmap;
    try {
      adjustedImage = adjustColorsWebGL(this.image, maxValues, saturation);
    } catch (e) {
      console.error(e);
      adjustedImage = adjustColors(this.image, maxValues, saturation);
    }
    console.timeEnd('color-correction');
    return transfer({adjustedImage}, [adjustedImage]);
  }
}
