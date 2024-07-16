/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';

import {createScaledImageBitmap, IMAGE_SIZE, imageBitmapToOffscreenCanvas} from '~/src/utils';

import {medianFilter} from './median-filter';

interface Result {
  blurred: ImageBitmap[];
}

export class Blur {
  async getBlurred(blob: Blob, medianFilterRadiuses: number[] = [0, 2, 3, 4]): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('blur');
    }
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.HD);
    const maxMedianFilterRadius: number = Math.max(...medianFilterRadiuses);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image, maxMedianFilterRadius);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const {data: origData, width, height} = imageData;
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
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('blur');
    }
    return transfer({blurred}, blurred);
  }
}
