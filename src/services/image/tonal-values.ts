/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';
import {medianFilter} from '.';
import {imageBitmapToOffscreenCanvas} from '../../utils';
import {getLightness, getLuminance} from '../color/model';

interface Result {
  tones: ImageBitmap[];
}

export class TonalValues {
  async getTones(
    file: File,
    thresholds: number[] = [75, 50, 25],
    medianFilterRadius = 3
  ): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('tones');
    }
    const image: ImageBitmap = await createImageBitmap(file);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image, medianFilterRadius);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const {data, width, height} = imageData;
    thresholds.sort((a: number, b: number) => b - a);
    const {length} = thresholds;
    const tonalValuesData = Array.from({length}, () => new Uint8ClampedArray(data.length));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = getLightness(getLuminance(r, g, b));
      tonalValuesData.forEach((result: Uint8ClampedArray, j: number) => {
        let v = 255;
        for (let k = 0; k <= j; k++) {
          if (l <= thresholds[k]) {
            v = Math.trunc((255 * (length - k - 1)) / length);
          }
        }
        result[i] = v;
        result[i + 1] = v;
        result[i + 2] = v;
        result[i + 3] = 255;
      });
    }
    const tones: ImageBitmap[] = await Promise.all(
      tonalValuesData.map((result: Uint8ClampedArray): Promise<ImageBitmap> => {
        const tonalValuesImageData = new ImageData(result, width, height);
        medianFilter(tonalValuesImageData, medianFilterRadius, 1);
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(tonalValuesImageData, 0, 0);
        const cropedImageData = ctx.getImageData(
          medianFilterRadius,
          medianFilterRadius,
          width - 2 * medianFilterRadius,
          height - 2 * medianFilterRadius
        );
        return createImageBitmap(cropedImageData);
      })
    );
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('tones');
    }
    return transfer({tones}, tones);
  }
}
