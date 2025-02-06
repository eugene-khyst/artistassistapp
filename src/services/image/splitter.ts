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

import {PAPER_SIZES} from '~/src/services/print/print';
import type {PaperSize} from '~/src/services/print/types';
import {PageOrientation} from '~/src/services/print/types';
import {IMAGE_SIZE} from '~/src/utils/graphics';
import type {Size} from '~/src/utils/types';

const MAX_CANVAS_SIZE = 8192;

export interface ImagePagesPreview {
  canvas: OffscreenCanvas;
  rows: number;
  cols: number;
  pageWidthPx: number;
  pageHeightPx: number;
  paperSize: PaperSize;
  orientation: PageOrientation;
}

export interface ImageTile {
  x: number;
  y: number;
  imageData: ImageData;
}

const LINE_WIDTH = 5;

export function splitImageIntoPagesPreview(
  image: ImageBitmap,
  targetSize: Size,
  paperSize: PaperSize
): ImagePagesPreview {
  const {width: imageWidth, height: imageHeight} = image;
  const [targetWidth, targetHeight] = targetSize;
  const [paperWidth, paperHeight] = PAPER_SIZES.get(paperSize)!.size;
  const paperSizes: Size[] = [
    [paperWidth, paperHeight],
    [paperHeight, paperWidth],
  ];
  let pages = Number.MAX_VALUE;
  let cols = 0;
  let rows = 0;
  let pageWidth = 0;
  let pageHeight = 0;
  for (const [w, h] of paperSizes) {
    const c = Math.ceil(targetWidth / w);
    const r = Math.ceil(targetHeight / h);
    const p = r * c;
    if (p < pages) {
      pages = p;
      cols = c;
      rows = r;
      pageWidth = w;
      pageHeight = h;
    }
  }
  const orientation = pageHeight > pageWidth ? PageOrientation.Portrait : PageOrientation.Landscape;
  const targetRatio = targetWidth / targetHeight;
  const imageRatio = imageWidth / imageHeight;
  let px2mm = 1;
  if (targetRatio <= imageRatio) {
    px2mm = imageWidth / targetWidth;
  } else if (targetRatio > imageRatio) {
    px2mm = imageHeight / targetHeight;
  }
  const pageWidthPx = px2mm * pageWidth;
  const pageHeightPx = px2mm * pageHeight;
  const canvasWidth = cols * pageWidthPx;
  const canvasHeight = rows * pageHeightPx;
  if (canvasWidth > MAX_CANVAS_SIZE || canvasHeight > MAX_CANVAS_SIZE) {
    throw new Error(`Canvas size is too big: ${canvasWidth}x${canvasHeight}`);
  }
  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  ctx.lineWidth = LINE_WIDTH * Math.sqrt((imageWidth * imageHeight) / IMAGE_SIZE['2K']);
  ctx.strokeStyle = 'black';
  ctx.strokeRect(0, 0, px2mm * targetWidth, px2mm * targetHeight);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * pageWidthPx;
      const y = r * pageHeightPx;
      ctx.strokeRect(x, y, pageWidthPx, pageHeightPx);
    }
  }
  return {
    canvas,
    rows,
    cols,
    pageWidthPx,
    pageHeightPx,
    paperSize,
    orientation,
  };
}

export function splitImageIntoPages({
  canvas,
  rows,
  cols,
  pageWidthPx,
  pageHeightPx,
}: ImagePagesPreview): OffscreenCanvas[] {
  const imageParts: OffscreenCanvas[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * pageWidthPx;
      const y = r * pageHeightPx;
      const canvasPart = new OffscreenCanvas(pageWidthPx, pageHeightPx);
      canvasPart
        .getContext('2d')!
        .drawImage(canvas, x, y, pageWidthPx, pageHeightPx, 0, 0, pageWidthPx, pageHeightPx);
      imageParts.push(canvasPart);
    }
  }
  return imageParts;
}
