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

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface DrawImageParams {
  width: number;
  height: number;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

export type DrawImageParamsSupplier = (drawImageParams: DrawImageParams) => DrawImageParams;

const NOOP_DRAW_IMAGE_PARAMS_SUPPLIER: DrawImageParamsSupplier = (
  drawImageParams: DrawImageParams
): DrawImageParams => drawImageParams;

export async function createImageBitmapResizedTotalPixels(
  image: ImageBitmapSource,
  totalPixels: number
): Promise<ImageBitmap> {
  const imageBitmap: ImageBitmap = await createImageBitmap(image);
  const {width, height} = imageBitmap;
  const scaleFactor: number = Math.min(1, Math.sqrt(totalPixels / (width * height)));
  const scaledImage: ImageBitmap = await createImageBitmap(imageBitmap, {
    resizeWidth: Math.trunc(scaleFactor * width),
  });
  imageBitmap.close();
  return scaledImage;
}

export function rotateImageBitmapClockwise(image: ImageBitmap): ImageBitmap {
  const {width, height} = image;
  const canvas = new OffscreenCanvas(height, width);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d')!;
  ctx.translate(height / 2, width / 2);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(image, -width / 2, -height / 2);
  return canvas.transferToImageBitmap();
}

function drawImage({width, height}: ImageBitmap): DrawImageParams {
  return {
    width,
    height,
    sx: 0,
    sy: 0,
    sw: width,
    sh: height,
    dx: 0,
    dy: 0,
    dw: width,
    dh: height,
  };
}

export function chain(
  ...suppliers: (DrawImageParamsSupplier | null | undefined)[]
): DrawImageParamsSupplier {
  return (initialParams: DrawImageParams): DrawImageParams =>
    suppliers
      .filter((supplier): supplier is DrawImageParamsSupplier => !!supplier)
      .reduce((params, supplier) => supplier(params), initialParams);
}

export function cropMargins(margins?: Margins): DrawImageParamsSupplier {
  const {top = 0, bottom = 0, left = 0, right = 0} = margins ?? {};
  return ({width: origWidth, height: origHeight}: DrawImageParams): DrawImageParams => {
    const targetWidth = origWidth - left - right;
    const targetHeight = origHeight - top - bottom;
    if (targetWidth <= 0 || targetHeight <= 0) {
      throw new Error('Incorrect image crop area');
    }
    return {
      width: targetWidth,
      height: targetHeight,
      sx: left,
      sy: top,
      sw: targetWidth,
      sh: targetHeight,
      dx: 0,
      dy: 0,
      dw: targetWidth,
      dh: targetHeight,
    };
  };
}

export function expandToAspectRatio(targetAspectRatio?: number): DrawImageParamsSupplier {
  return ({
    width: origWidth,
    height: origHeight,
    sx,
    sy,
    sw,
    sh,
    dw,
    dh,
  }: DrawImageParams): DrawImageParams => {
    let targetWidth = origWidth;
    let targetHeight = origHeight;
    let dx = 0;
    let dy = 0;
    if (targetAspectRatio) {
      const origAspectRatio = origWidth / origHeight;
      if (targetAspectRatio > origAspectRatio) {
        targetWidth = origHeight * targetAspectRatio;
        dx = (targetWidth - origWidth) / 2;
      } else {
        targetHeight = origWidth / targetAspectRatio;
        dy = (targetHeight - origHeight) / 2;
      }
    }
    return {
      width: targetWidth,
      height: targetHeight,
      sx,
      sy,
      sw,
      sh,
      dx,
      dy,
      dw,
      dh,
    };
  };
}

export function resizeAndCrop(targetWidth: number, targetHeight: number): DrawImageParamsSupplier {
  const targetAspectRatio = targetWidth / targetHeight;
  return ({width: origWidth, height: origHeight}: DrawImageParams): DrawImageParams => {
    const origAspectRatio = origWidth / origHeight;
    let sw = origWidth;
    let sh = origHeight;
    let sx = 0;
    let sy = 0;
    if (origAspectRatio > targetAspectRatio) {
      sw = origHeight * targetAspectRatio;
      sx = (origWidth - sw) / 2;
    } else {
      sh = origWidth / targetAspectRatio;
      sy = (origHeight - sh) / 2;
    }
    return {
      width: targetWidth,
      height: targetHeight,
      sx,
      sy,
      sw,
      sh,
      dx: 0,
      dy: 0,
      dw: targetWidth,
      dh: targetHeight,
    };
  };
}

export function imageBitmapToOffscreenCanvas(
  image: ImageBitmap,
  willReadFrequently = false,
  drawImageParamsSupplier?: DrawImageParamsSupplier | null,
  fillStyle = '#fff'
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const {width, height, sx, sy, sw, sh, dx, dy, dw, dh} = (
    drawImageParamsSupplier ?? NOOP_DRAW_IMAGE_PARAMS_SUPPLIER
  )(drawImage(image));
  const canvas = new OffscreenCanvas(width, height);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d', {
    willReadFrequently,
  })!;
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  return [canvas, ctx];
}

export function imageBitmapToImageData(
  image: ImageBitmap,
  drawImageParamsSupplier?: DrawImageParamsSupplier
): [ImageData, OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const [canvas, ctx] = imageBitmapToOffscreenCanvas(image, true, drawImageParamsSupplier);
  const {width, height} = canvas;
  return [ctx.getImageData(0, 0, width, height), canvas, ctx];
}

export function imageDataToOffscreenCanvas(imageData: ImageData): OffscreenCanvas {
  const {width, height} = imageData;
  const canvas = new OffscreenCanvas(width, height);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function offscreenCanvasToBlob(
  offscreenCanvas: OffscreenCanvas,
  options?: ImageEncodeOptions
): Promise<Blob> {
  const {type = 'image/jpeg', quality = 0.95} = options ?? {};
  return await offscreenCanvas.convertToBlob({type, quality});
}

export async function imageBitmapToBlob(
  image: ImageBitmap,
  drawImageParamsSupplier?: DrawImageParamsSupplier | null,
  options?: ImageEncodeOptions
): Promise<Blob> {
  const [canvas] = imageBitmapToOffscreenCanvas(image, false, drawImageParamsSupplier);
  return await offscreenCanvasToBlob(canvas, options);
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
  return 4 * width * y + 4 * x + channel;
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

export function isWebGl2Supported(): boolean {
  try {
    const canvas = new OffscreenCanvas(1, 1);
    const ctx: WebGL2RenderingContext | null = canvas.getContext('webgl2');
    return !!ctx;
  } catch {
    return false;
  }
}
