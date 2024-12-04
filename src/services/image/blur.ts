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

import {createScaledImageBitmap, IMAGE_SIZE, imageBitmapToOffscreenCanvas} from '~/src/utils';

import {medianFilter} from './median-filter';

interface Result {
  blurred: ImageBitmap[];
}

export class Blur {
  async getBlurred(blob: Blob, medianFilterRadiuses: number[] = [0, 2, 3, 4]): Promise<Result> {
    console.time('blur');
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.HD);
    const maxMedianFilterRadius: number = Math.max(...medianFilterRadiuses);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image, maxMedianFilterRadius);
    const {data: origData, width, height} = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const blurred: ImageBitmap[] = await Promise.all(
      medianFilterRadiuses.map((medianFilterRadius: number): Promise<ImageBitmap> => {
        const blurredImageData = new ImageData(new Uint8ClampedArray(origData), width, height);
        medianFilter(blurredImageData, medianFilterRadius, 3);
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(blurredImageData, 0, 0);
        const cropedImageData = ctx.getImageData(
          maxMedianFilterRadius,
          maxMedianFilterRadius,
          width - 2 * maxMedianFilterRadius,
          height - 2 * maxMedianFilterRadius
        );
        return createImageBitmap(cropedImageData);
      })
    );
    console.timeEnd('blur');
    return transfer({blurred}, blurred);
  }
}
