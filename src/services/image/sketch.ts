/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';
import {medianFilter} from '.';
import {imageBitmapToOffscreenCanvas} from '../../utils';

interface Result {
  sketch: ImageBitmap;
}

export class Sketch {
  async getSketch(file: File, medianFilterRadius = 5): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('sketch');
    }
    const image: ImageBitmap = await createImageBitmap(file);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image, medianFilterRadius);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const {width, height} = imageData;
    medianFilter(imageData, medianFilterRadius, 3);
    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(imageData, 0, 0);
    const cropedImageData = ctx.getImageData(
      medianFilterRadius,
      medianFilterRadius,
      width - 2 * medianFilterRadius,
      height - 2 * medianFilterRadius
    );
    const sketch = await createImageBitmap(cropedImageData);
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('sketch');
    }
    return transfer({sketch}, [sketch]);
  }
}
