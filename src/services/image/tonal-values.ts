/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';

import {Rgb} from '~/src/services/color/space';
import {createScaledImageBitmap, IMAGE_SIZE, imageBitmapToOffscreenCanvas} from '~/src/utils';

import {medianFilter} from './median-filter';

interface Result {
  tones: ImageBitmap[];
}

export class TonalValues {
  async getTones(
    blob: Blob,
    thresholds: number[] = [0.825, 0.6, 0.35],
    medianFilterRadius = 3
  ): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('tones');
    }
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.HD);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image, medianFilterRadius);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const {data: origData, width, height} = imageData;
    thresholds.sort((a: number, b: number) => b - a);
    const {length} = thresholds;
    const tonesData = Array.from({length}, () => new Uint8ClampedArray(origData.length));
    for (let i = 0; i < origData.length; i += 4) {
      const r = origData[i];
      const g = origData[i + 1];
      const b = origData[i + 2];
      const {l} = new Rgb(r, g, b).toOklab();
      tonesData.forEach((data: Uint8ClampedArray, j: number) => {
        let v = 255;
        for (let k = 0; k <= j; k++) {
          if (l <= thresholds[k]) {
            v = Math.trunc((255 * (length - k - 1)) / length);
          }
        }
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = 255;
      });
    }
    const tones: ImageBitmap[] = await Promise.all(
      tonesData.map((toneData: Uint8ClampedArray): Promise<ImageBitmap> => {
        const toneImageData = new ImageData(toneData, width, height);
        medianFilter(toneImageData, medianFilterRadius, 1);
        ctx.clearRect(0, 0, width, height);
        ctx.putImageData(toneImageData, 0, 0);
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
