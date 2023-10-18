/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';
import {medianFilter} from '.';
import {imageBitmapToOffscreenCanvasWithScaling} from '../../utils';

interface Result {
  sketches: ImageBitmap[];
}

export class Sketch {
  async getSketches(file: File, medianFilterRadiuses: number[] = [2, 3, 4]): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('sketches');
    }
    const image: ImageBitmap = await createImageBitmap(file);
    const maxMedianFilterRadius: number = Math.max(...medianFilterRadiuses);
    const [canvas, ctx] = imageBitmapToOffscreenCanvasWithScaling(image, maxMedianFilterRadius);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const {data: origData, width, height} = imageData;
    const sketches: ImageBitmap[] = await Promise.all(
      medianFilterRadiuses.map((medianFilterRadius: number): Promise<ImageBitmap> => {
        const sketchImageData = new ImageData(new Uint8ClampedArray(origData), width, height);
        medianFilter(sketchImageData, medianFilterRadius, 3);
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(sketchImageData, 0, 0);
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
      console.timeEnd('sketches');
    }
    return transfer({sketches}, sketches);
  }
}
