/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export const IMAGE_SIZE = {
  SD: 720 * 480,
  HD: 1280 * 720,
  '2K': 2560 * 1440,
};

export async function createScaledImageBitmap(
  blob: Blob,
  maxImageArea: number
): Promise<ImageBitmap> {
  const image: ImageBitmap = await createImageBitmap(blob);
  const scale: number = Math.min(1, Math.sqrt(maxImageArea / (image.width * image.height)));
  const scaledImage: ImageBitmap = await createImageBitmap(image, {
    resizeWidth: Math.trunc(image.width * scale),
  });
  image.close();
  return scaledImage;
}

export function imageBitmapToOffscreenCanvas(
  image: ImageBitmap,
  expandBy = 0
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const {width, height} = image;
  const canvas = new OffscreenCanvas(width + 2 * expandBy, height + 2 * expandBy);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d', {
    willReadFrequently: true,
  })!;
  ctx.drawImage(image, expandBy, expandBy, width, height);
  return [canvas, ctx];
}

export function imageBitmapToImageData(image: ImageBitmap): ImageData {
  const [canvas, ctx] = imageBitmapToOffscreenCanvas(image);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

export function getIndexForCoord(x: number, y: number, width: number, channel: number): number {
  if (channel < 0 || channel > 3) {
    throw new Error('Rgba channel must be between 0 and 3');
  }
  return y * (width * 4) + x * 4 + channel;
}

export function getRgbaForCoord(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): number[] {
  if (x > width) {
    throw new Error('x coordinate must be less than image width');
  }
  const index = getIndexForCoord(x, y, width, 0);
  return [data[index], data[index + 1], data[index + 2], data[index + 3]];
}
