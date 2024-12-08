/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import type {Size} from '~/src/utils';

const MAX_CANVAS_SIZE = 8192;

export interface SplitImagePreview {
  canvas: OffscreenCanvas;
  rows: number;
  cols: number;
  pageWidthPx: number;
  pageHeightPx: number;
}

export function splitImagePreview(
  image: ImageBitmap,
  targetSize: Size,
  paperSizes: Size[],
  lineWidth = 5
): SplitImagePreview {
  const [targetWidth, targetHeight] = targetSize;
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
  const targetRatio = targetWidth / targetHeight;
  const imageRatio = image.width / image.height;
  let px2mm = 1;
  if (targetRatio <= imageRatio) {
    px2mm = image.width / targetWidth;
  } else if (targetRatio > imageRatio) {
    px2mm = image.height / targetHeight;
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
  ctx.lineWidth = lineWidth;
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
  };
}

export function splitImageIntoParts({
  canvas,
  rows,
  cols,
  pageWidthPx,
  pageHeightPx,
}: SplitImagePreview): OffscreenCanvas[] {
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
