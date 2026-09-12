/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import type {Fraction} from '@eugene-khyst/artistassistapp-color-mixer';

import type {Rectangle, Vector} from '@/services/math/geometry';
import {identity} from '@/utils/function';

export type DrawImageSource = ImageBitmap | OffscreenCanvas;

export type ImageDimension = Pick<DrawImageSource, 'width' | 'height'>;

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

export type DrawImageParamsSupplier = (params: DrawImageParams) => DrawImageParams;

export const DrawImage = {
  cropRectangle: (rectangle: Rectangle): DrawImageParamsSupplier => {
    return ({width: origWidth, height: origHeight}: DrawImageParams): DrawImageParams => {
      const sx = Math.max(0, Math.round(rectangle.topLeft.x));
      const sy = Math.max(0, Math.round(rectangle.topLeft.y));
      const right = Math.min(origWidth, Math.round(rectangle.bottomRight.x));
      const bottom = Math.min(origHeight, Math.round(rectangle.bottomRight.y));
      const targetWidth = right - sx;
      const targetHeight = bottom - sy;
      if (targetWidth <= 0 || targetHeight <= 0) {
        throw new Error('Incorrect image crop area');
      }
      return {
        width: targetWidth,
        height: targetHeight,
        sx,
        sy,
        sw: targetWidth,
        sh: targetHeight,
        dx: 0,
        dy: 0,
        dw: targetWidth,
        dh: targetHeight,
      };
    };
  },

  scale: (scale: number, sizeMultiple?: number): DrawImageParamsSupplier => {
    return ({width: origWidth, height: origHeight}: DrawImageParams): DrawImageParams => {
      let targetWidth = Math.max(1, Math.round(origWidth * scale));
      let targetHeight = Math.max(1, Math.round(origHeight * scale));
      if (sizeMultiple) {
        targetWidth = ceilToMultiple(targetWidth, sizeMultiple);
        targetHeight = ceilToMultiple(targetHeight, sizeMultiple);
      }
      return {
        width: targetWidth,
        height: targetHeight,
        sx: 0,
        sy: 0,
        sw: origWidth,
        sh: origHeight,
        dx: 0,
        dy: 0,
        dw: targetWidth,
        dh: targetHeight,
      };
    };
  },

  resizeToPixelCount: (pixelCount: number, sizeMultiple?: number): DrawImageParamsSupplier => {
    return (params: DrawImageParams): DrawImageParams => {
      const {width, height} = params;
      return DrawImage.scale(scaleToPixelCount(width, height, pixelCount), sizeMultiple)(params);
    };
  },

  resizeToSize: (targetWidth: number, targetHeight: number): DrawImageParamsSupplier => {
    return ({width: origWidth, height: origHeight}: DrawImageParams): DrawImageParams => {
      return {
        width: targetWidth,
        height: targetHeight,
        sx: 0,
        sy: 0,
        sw: origWidth,
        sh: origHeight,
        dx: 0,
        dy: 0,
        dw: targetWidth,
        dh: targetHeight,
      };
    };
  },

  resizeToLongestSide: (maxSide: number): DrawImageParamsSupplier => {
    return (params: DrawImageParams): DrawImageParams => {
      const {width, height} = params;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      return DrawImage.scale(scale)(params);
    };
  },
};

function chainDrawImageParamsSuppliers(
  suppliers:
    DrawImageParamsSupplier | null | undefined | (DrawImageParamsSupplier | null | undefined)[]
): DrawImageParamsSupplier {
  if (!Array.isArray(suppliers)) {
    return suppliers ?? identity;
  }
  return (initialParams: DrawImageParams): DrawImageParams =>
    suppliers
      .filter((supplier): supplier is DrawImageParamsSupplier => !!supplier)
      .reduce((params, supplier) => supplier(params), initialParams);
}

function imageToDrawImageParams({width, height}: DrawImageSource): DrawImageParams {
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

export type ResizeImageParamsSupplier = (image: DrawImageSource) => ImageBitmapOptions;

export const ResizeImage = {
  resizeToSize: (resizeWidth: number, resizeHeight: number): ResizeImageParamsSupplier => {
    return (): ImageBitmapOptions => ({resizeWidth, resizeHeight});
  },

  resizeToPixelCount: (pixelCount: number): ResizeImageParamsSupplier => {
    return ({width, height}: DrawImageSource): ImageBitmapOptions => {
      const scale: number = scaleToPixelCount(width, height, pixelCount);
      const resizeWidth = Math.max(1, Math.round(width * scale));
      return {
        resizeWidth,
      };
    };
  },
};

export function scaleToPixelCount(width: number, height: number, pixelCount: number): number {
  return Math.min(1, Math.sqrt(pixelCount / (width * height)));
}

export const IMAGE_SIZE = {
  SD: 720 * 480,
  HD: 1280 * 720,
  '2K': 2560 * 1440,
};

export async function resizeImageBitmap(
  image: DrawImageSource,
  resizeImageParamsSupplier?: ResizeImageParamsSupplier | null,
  resizeQuality?: ResizeQuality
): Promise<ImageBitmap> {
  const scaledImage: ImageBitmap = await createImageBitmap(image, {
    ...resizeImageParamsSupplier?.(image),
    resizeQuality: resizeQuality ?? 'high',
  });
  return scaledImage;
}

export async function createImageBitmapAndResize(
  blob: Blob,
  resizeImageParamsSupplier?: ResizeImageParamsSupplier | null
): Promise<ImageBitmap> {
  const image: ImageBitmap = await createImageBitmap(blob);
  try {
    return await createImageBitmap(image, resizeImageParamsSupplier?.(image));
  } finally {
    image.close();
  }
}

export function fillOffscreenCanvasBackground(
  canvas: OffscreenCanvas,
  backgroundColor: string
): void {
  const ctx = canvas.getContext('2d')!;
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
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

export interface DrawImageOptions {
  willReadFrequently?: boolean;
  drawImage?: DrawImageParamsSupplier | null | (DrawImageParamsSupplier | null | undefined)[];
  fillStyle?: string;
}

export function drawImageToOffscreenCanvas(
  image: DrawImageSource,
  {
    willReadFrequently = false,
    drawImage: drawImageParamsSuppliers,
    fillStyle = 'transparent',
  }: DrawImageOptions = {}
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const drawImageParamsSupplier: DrawImageParamsSupplier =
    chainDrawImageParamsSuppliers(drawImageParamsSuppliers);
  const {width, height, sx, sy, sw, sh, dx, dy, dw, dh} = drawImageParamsSupplier(
    imageToDrawImageParams(image)
  );
  const canvas = new OffscreenCanvas(width, height);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d', {
    willReadFrequently,
  })!;
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  return [canvas, ctx];
}

export function offscreenCanvasToImageData(
  canvas: OffscreenCanvas,
  ctx?: OffscreenCanvasRenderingContext2D
): ImageData {
  ctx ??= canvas.getContext('2d', {willReadFrequently: true})!;
  const {width, height} = ctx.canvas;
  return ctx.getImageData(0, 0, width, height);
}

export function imageDataToOffscreenCanvas(imageData: ImageData): OffscreenCanvas {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  canvas.getContext('2d')!.putImageData(imageData, 0, 0);
  return canvas;
}

export async function offscreenCanvasToBlob(
  offscreenCanvas: OffscreenCanvas,
  {type = 'image/jpeg', quality = 0.95}: ImageEncodeOptions = {}
): Promise<Blob> {
  return await offscreenCanvas.convertToBlob({type, quality});
}

export async function imageToBlob(
  image: DrawImageSource,
  {
    encodeOptions,
    ...drawImageOptions
  }: Omit<DrawImageOptions, 'willReadFrequently'> & {encodeOptions?: ImageEncodeOptions} = {}
): Promise<Blob> {
  const type = encodeOptions?.type ?? 'image/jpeg';
  const [canvas] = drawImageToOffscreenCanvas(image, {
    ...drawImageOptions,
    fillStyle: drawImageOptions.fillStyle ?? (type === 'image/jpeg' ? '#fff' : 'transparent'),
  });
  return await offscreenCanvasToBlob(canvas, encodeOptions);
}

export function toOffscreenCanvas(image: DrawImageSource): OffscreenCanvas {
  if (image instanceof OffscreenCanvas) {
    return image;
  }
  const [canvas] = drawImageToOffscreenCanvas(image);
  return canvas;
}

export function copyOffscreenCanvas(canvas: OffscreenCanvas): OffscreenCanvas {
  const [canvasCopy] = drawImageToOffscreenCanvas(canvas);
  return canvasCopy;
}

export function createPolygonMask(
  vertices: readonly Vector[],
  {width, height}: Pick<DrawImageSource, 'width' | 'height'>
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
  for (const {x, y} of vertices.slice(1)) {
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  return canvas;
}

export function applyMask(image: DrawImageSource, mask: DrawImageSource): OffscreenCanvas {
  const [canvas, ctx] = drawImageToOffscreenCanvas(image, {fillStyle: 'transparent'});
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  return canvas;
}

export function fadeImage(
  image: DrawImageSource,
  opaque: Vector,
  transparent: Vector
): OffscreenCanvas {
  const [canvas, ctx] = drawImageToOffscreenCanvas(image);
  const gradient = ctx.createLinearGradient(opaque.x, opaque.y, transparent.x, transparent.y);
  gradient.addColorStop(0, '#000');
  gradient.addColorStop(1, '#0000');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export function mergeImages(destCanvas: OffscreenCanvas, ...srcImages: DrawImageSource[]): void {
  const ctx: OffscreenCanvasRenderingContext2D = destCanvas.getContext('2d')!;
  for (const image of srcImages) {
    ctx.drawImage(image, 0, 0);
  }
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

export function aspectRatioSize(
  origWidth: number,
  origHeight: number,
  aspectRatio?: Fraction
): ImageDimension {
  const [ratioWidth, ratioHeight]: Fraction = aspectRatio ?? [0, 0];
  if (ratioWidth <= 0 || ratioHeight <= 0) {
    return {width: origWidth, height: origHeight};
  }
  const aspectRatioDelta = origWidth * ratioHeight - origHeight * ratioWidth;
  const onePixelAspectRatioDelta = Math.max(ratioWidth, ratioHeight);
  if (Math.abs(aspectRatioDelta) <= onePixelAspectRatioDelta) {
    return {width: origWidth, height: origHeight};
  }
  const targetAspectRatio = ratioWidth / ratioHeight;
  if (aspectRatioDelta < 0) {
    return {width: Math.ceil(origHeight * targetAspectRatio), height: origHeight};
  }
  return {width: origWidth, height: Math.ceil(origWidth / targetAspectRatio)};
}

export function getBoundingSize(images: DrawImageSource[]): ImageDimension | undefined {
  if (!images.length) {
    return;
  }
  const [image] = images;
  let {width: maxWidth, height: maxHeight} = image!;
  for (let i = 1; i < images.length; i++) {
    const {width, height} = images[i]!;
    if (width > maxWidth) {
      maxWidth = width;
    }
    if (height > maxHeight) {
      maxHeight = height;
    }
  }
  return {width: maxWidth, height: maxHeight};
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

export function ceilToMultiple(value: number, multiple?: number): number {
  if (!multiple || multiple === 1) {
    return value;
  }
  return value % multiple === 0 ? value : (Math.floor(value / multiple) + 1) * multiple;
}

export function padTile(tile: OffscreenCanvas, multiple: number | undefined): OffscreenCanvas {
  const width = ceilToMultiple(tile.width, multiple);
  const height = ceilToMultiple(tile.height, multiple);
  if (width === tile.width && height === tile.height) {
    return tile;
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  // With smoothing on, stretched edge pixels blend with the transparent pixels next to them.
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tile, 0, 0);
  if (width > tile.width) {
    const edge = tile.width - 1;
    ctx.drawImage(tile, edge, 0, 1, tile.height, tile.width, 0, width - tile.width, tile.height);
  }
  if (height > tile.height) {
    const edge = tile.height - 1;
    ctx.drawImage(canvas, 0, edge, width, 1, 0, tile.height, width, height - tile.height);
  }
  return canvas;
}
