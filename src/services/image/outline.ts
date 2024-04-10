/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';
import {erodeFilter} from '~/src/services/image/erode-filter';
import {IMAGE_SIZE, createScaledImageBitmap} from '~/src/utils';

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

    ctx.filter = 'grayscale(1) invert(1)';
    ctx.drawImage(image, 0, 0, width, height);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    erodeFilter(imageData, erodeFilterRadius);
    const erodedImage: ImageBitmap = await createImageBitmap(imageData);

    ctx.filter = 'grayscale(1)';
    ctx.drawImage(image, 0, 0, width, height);
    image.close();

    ctx.globalCompositeOperation = 'color-dodge';
    ctx.filter = 'none';
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
