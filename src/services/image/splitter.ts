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

export class TargetSizeError extends Error {}
export class MarginError extends Error {}

const LINE_WIDTH = 5;

export function splitImageIntoPagesPreview(
  image: ImageBitmap,
  targetSize: Size,
  paperSize: PaperSize,
  margin: number
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

  const safeMargin = Math.max(0, margin);
  const imageTargetWidth = targetWidth - 2 * safeMargin;
  const imageTargetHeight = targetHeight - 2 * safeMargin;
  if (imageTargetWidth <= 0 || imageTargetHeight <= 0) {
    throw new MarginError('Margins are too large for the target size');
  }

  const imageRatio = imageWidth / imageHeight;
  const imageTargetRatio = imageTargetWidth / imageTargetHeight;
  let px2mm = 1;
  if (imageTargetRatio <= imageRatio) {
    px2mm = imageWidth / imageTargetWidth;
  } else {
    px2mm = imageHeight / imageTargetHeight;
  }

  const pageWidthPx = px2mm * pageWidth;
  const pageHeightPx = px2mm * pageHeight;
  const canvasWidth = cols * pageWidthPx;
  const canvasHeight = rows * pageHeightPx;

  if (canvasWidth > MAX_CANVAS_SIZE || canvasHeight > MAX_CANVAS_SIZE) {
    throw new TargetSizeError(`Canvas size is too large: ${canvasWidth}x${canvasHeight}`);
  }

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d')!;

  const marginPx = px2mm * safeMargin;

  const imageTargetWidthPx = px2mm * imageTargetWidth;
  const imageTargetHeightPx = px2mm * imageTargetHeight;

  const dx = marginPx + (imageTargetWidthPx - imageWidth) / 2;
  const dy = marginPx + (imageTargetHeightPx - imageHeight) / 2;

  ctx.drawImage(image, dx, dy);

  ctx.lineWidth = LINE_WIDTH * Math.sqrt((imageWidth * imageHeight) / IMAGE_SIZE['2K']);
  ctx.strokeStyle = 'black';
  ctx.strokeRect(0, 0, px2mm * targetWidth, px2mm * targetHeight);
  if (safeMargin > 0) {
    ctx.strokeRect(marginPx, marginPx, imageTargetWidthPx, imageTargetHeightPx);
  }
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
