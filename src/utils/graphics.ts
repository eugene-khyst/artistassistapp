/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export const IMAGE_SIZE = {
  SD: 720 * 480,
  HD: 1280 * 720,
  '2K': 2560 * 1440,
};

async function createImageBitmapWithFallback(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob);
  } catch (error) {
    console.error(error);
    return await createErrorImageBitmap(error instanceof Error ? error.message : undefined);
  }
}

export async function createScaledImageBitmap(
  blob: Blob,
  maxImageArea: number
): Promise<ImageBitmap> {
  const image: ImageBitmap = await createImageBitmapWithFallback(blob);
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

async function createErrorImageBitmap(error?: string): Promise<ImageBitmap> {
  const emojiFontSize = 84;
  const titleFontSize = 48;
  const titleLineHeight: number = 1.5 * titleFontSize;
  const padding = 16;
  const textFontSize = 24;
  const textLineHeight: number = 1.5 * textFontSize;

  const canvas = new OffscreenCanvas(720, 480);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d')!;

  ctx.font = `${emojiFontSize}px serif`;
  const emoji = '⚠️';
  const {width: emojiWidth}: TextMetrics = ctx.measureText(emoji);
  ctx.fillText(emoji, canvas.width / 2 - emojiWidth / 2, canvas.height / 2 - titleLineHeight);
  ctx.font = `${titleFontSize}px serif`;
  const title = 'Error loading image';
  const {width: titleWidth}: TextMetrics = ctx.measureText(title);
  ctx.fillText(title, canvas.width / 2 - titleWidth / 2, canvas.height / 2);
  if (error) {
    ctx.font = `${textFontSize}px serif`;
    const words: string[] = error.split(' ');
    const lines: string[] = [];
    let currentLine: string = words[0];
    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const line: string = currentLine + ' ' + word;
      const {width} = ctx.measureText(line);
      if (width < canvas.width - 2 * padding) {
        currentLine = line;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      ctx.fillText(line, padding, canvas.height / 2 + (i + 2) * textLineHeight);
    }
  }
  return await createImageBitmap(canvas);
}
