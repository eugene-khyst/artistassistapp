/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

export const IMAGE_SIZE = {
  SD: 720 * 480,
  HD: 1280 * 720,
  '2K': 2560 * 1440,
};

export async function createImageBitmapWithFallback(
  image: ImageBitmapSource
): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(image);
  } catch (error) {
    console.error(error);
    return createErrorImageBitmap(error instanceof Error ? error.message : undefined);
  }
}

export async function createImageBitmapScaledTotalPixels(
  blob: Blob,
  totalPixels: number
): Promise<ImageBitmap> {
  const imageBitmap: ImageBitmap = await createImageBitmapWithFallback(blob);
  const {width, height} = imageBitmap;
  const scale: number = Math.min(1, Math.sqrt(totalPixels / (width * height)));
  const scaledImage: ImageBitmap = await createImageBitmap(imageBitmap, {
    resizeWidth: Math.trunc(width * scale),
  });
  imageBitmap.close();
  return scaledImage;
}

export function imageBitmapToOffscreenCanvas(
  image: ImageBitmap
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const {width, height} = image;
  const canvas = new OffscreenCanvas(width, height);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d', {
    willReadFrequently: true,
  })!;
  ctx.drawImage(image, 0, 0);
  return [canvas, ctx];
}

export function imageBitmapToImageData(
  image: ImageBitmap
): [ImageData, OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const [canvas, ctx] = imageBitmapToOffscreenCanvas(image);
  const {width, height} = canvas;
  return [ctx.getImageData(0, 0, width, height), canvas, ctx];
}

export function copyOffscreenCanvas(canvas: OffscreenCanvas): OffscreenCanvas {
  const {width, height} = canvas;
  const canvasCopy = new OffscreenCanvas(width, height);
  canvasCopy.getContext('2d')!.drawImage(canvas, 0, 0);
  return canvasCopy;
}

export function applyMask(image: ImageBitmap, mask: OffscreenCanvas): OffscreenCanvas {
  const [canvas, ctx] = imageBitmapToOffscreenCanvas(image);
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  return canvas;
}

export function getIndexForCoord(x: number, y: number, width: number, channel: number): number {
  if (channel < 0 || channel > 3) {
    throw new Error('Rgba channel must be between 0 and 3');
  }
  return y * width * 4 + x * 4 + channel;
}

export function getRgbaForCoord(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number
): Uint8ClampedArray {
  if (x > width) {
    throw new Error('x coordinate must be less than image width');
  }
  const i = getIndexForCoord(x, y, width, 0);
  return data.subarray(i, i + 4);
}

function createErrorImageBitmap(error?: string): ImageBitmap {
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
    const words = error.split(' ');
    const lines: string[] = [];
    let currentLine = words[0]!;
    for (let i = 1; i < words.length; i++) {
      const word = words[i]!;
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
      const line = lines[i]!;
      ctx.fillText(line, padding, canvas.height / 2 + (i + 2) * textLineHeight);
    }
  }
  return canvas.transferToImageBitmap();
}
