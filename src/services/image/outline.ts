/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';

import {erodeFilter} from '~/src/services/image/erode-filter';
import {grayscale} from '~/src/services/image/grayscale-filter';
import {invert} from '~/src/services/image/invert-filter';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

interface Result {
  outline: ImageBitmap;
}

export class Outline {
  async getOutline(blob: Blob, erodeFilterRadius = 2): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('outline');
    }
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE['2K']);
    const {width, height} = image;
    const canvas = new OffscreenCanvas(width, height);
    const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d', {
      willReadFrequently: true,
    })!;

    ctx.drawImage(image, 0, 0, width, height);
    image.close();

    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    grayscale(imageData);
    const grayscaleImage: ImageBitmap = await createImageBitmap(imageData);
    invert(imageData);
    erodeFilter(imageData, erodeFilterRadius);
    const erodedImage: ImageBitmap = await createImageBitmap(imageData);

    ctx.drawImage(grayscaleImage, 0, 0, width, height);
    grayscaleImage.close();

    ctx.globalCompositeOperation = 'color-dodge';
    ctx.drawImage(erodedImage, 0, 0, width, height);
    erodedImage.close();

    const outlineImageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const outline: ImageBitmap = await createImageBitmap(outlineImageData);
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('outline');
    }
    return transfer({outline}, [outline]);
  }
}
