/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function imageBitmapToOffscreenCanvas(
  image: ImageBitmap
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const canvas = new OffscreenCanvas(image.width, image.height);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d', {
    willReadFrequently: true,
  })!;
  ctx.drawImage(image, 0, 0);
  return [canvas, ctx];
}

export function imageBitmapToOffscreenCanvasWithScaling(
  image: ImageBitmap,
  expandBy = 0,
  maxCanvasArea = 1280 * 720
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const scale: number = Math.min(1, Math.sqrt(maxCanvasArea / (image.width * image.height)));
  const width = Math.trunc(image.width * scale);
  const height = Math.trunc(image.height * scale);
  const canvas = new OffscreenCanvas(width + 2 * expandBy, height + 2 * expandBy);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d', {
    willReadFrequently: true,
  })!;
  if (expandBy > 0) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
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
  const red = getIndexForCoord(x, y, width, 0);
  return [data[red], data[red + 1], data[red + 2], data[red + 3]];
}
