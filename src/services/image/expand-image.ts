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

import {clamp} from '@eugene-khyst/artistassistapp-color-mixer';

import {
  type ExpandImageControls,
  ExpandImageSizeMode,
} from '@/services/image/expand-image-controls';
import {Rectangle, Vector} from '@/services/math/geometry';
import {
  aspectRatioSize,
  type DrawImageSource,
  type ImageDimension,
  scaleToPixelCount,
} from '@/utils/graphics';

export interface ImageExpansion {
  bounds: Rectangle;
  sourceRectangle: Rectangle;
  margins: readonly Rectangle[];
}

const MAX_EXPANDED_IMAGE_PIXELS = 4000 * 4000;

function expandedSize(
  width: number,
  height: number,
  controls: ExpandImageControls
): ImageDimension {
  if (controls.sizeMode === ExpandImageSizeMode.AspectRatio) {
    return aspectRatioSize(width, height, controls.aspectRatio);
  }
  const marginX = Math.round((width * clamp(controls.marginX, 0, 100)) / 100);
  const marginY = Math.round((height * clamp(controls.marginY, 0, 100)) / 100);
  return {width: width + 2 * marginX, height: height + 2 * marginY};
}

function shrinkDimension(size: number, scale: number): number {
  return size > 1 ? clamp(Math.round(scale * size), 1, size - 1) : 1;
}

export function getImageExpansion(
  {width, height}: Pick<DrawImageSource, 'width' | 'height'>,
  controls: ExpandImageControls
): ImageExpansion {
  const {width: expandedWidth, height: expandedHeight} = expandedSize(width, height, controls);

  const scale = scaleToPixelCount(expandedWidth, expandedHeight, MAX_EXPANDED_IMAGE_PIXELS);
  let sourceWidth = Math.max(1, Math.round(scale * width));
  let sourceHeight = Math.max(1, Math.round(scale * height));
  // Expand the scaled size so that expanding it again has no effect.
  let {width: targetWidth, height: targetHeight} = expandedSize(
    sourceWidth,
    sourceHeight,
    controls
  );
  while (targetWidth * targetHeight > MAX_EXPANDED_IMAGE_PIXELS) {
    const shrink = scaleToPixelCount(targetWidth, targetHeight, MAX_EXPANDED_IMAGE_PIXELS);
    sourceWidth = shrinkDimension(sourceWidth, shrink);
    sourceHeight = shrinkDimension(sourceHeight, shrink);
    ({width: targetWidth, height: targetHeight} = expandedSize(
      sourceWidth,
      sourceHeight,
      controls
    ));
  }

  const left = Math.floor((targetWidth - sourceWidth) / 2);
  const top = Math.floor((targetHeight - sourceHeight) / 2);
  const right = targetWidth - sourceWidth - left;
  const bottom = targetHeight - sourceHeight - top;
  const bounds = new Rectangle(new Vector(targetWidth, targetHeight));
  const sourceRectangle = Rectangle.fromTopLeft(new Vector(left, top), sourceWidth, sourceHeight);
  const margins: Rectangle[] = [];
  if (top > 0) {
    margins.push(Rectangle.fromTopLeft(Vector.ZERO, targetWidth, top));
  }
  if (bottom > 0) {
    margins.push(Rectangle.fromTopLeft(new Vector(0, top + sourceHeight), targetWidth, bottom));
  }
  if (left > 0) {
    margins.push(Rectangle.fromTopLeft(new Vector(0, top), left, sourceHeight));
  }
  if (right > 0) {
    margins.push(Rectangle.fromTopLeft(new Vector(left + sourceWidth, top), right, sourceHeight));
  }
  return {bounds, sourceRectangle, margins};
}

export function drawExpandedImage(
  image: DrawImageSource,
  expansion: ImageExpansion,
  marginColor: string
): [OffscreenCanvas, OffscreenCanvasRenderingContext2D] {
  const canvas = new OffscreenCanvas(expansion.bounds.width, expansion.bounds.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = marginColor;
  for (const {topLeft, width, height} of expansion.margins) {
    ctx.fillRect(topLeft.x, topLeft.y, width, height);
  }
  const {topLeft, width, height} = expansion.sourceRectangle;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, topLeft.x, topLeft.y, width, height);
  return [canvas, ctx];
}

export function createExpansionMask({bounds, margins}: ImageExpansion): OffscreenCanvas {
  const canvas = new OffscreenCanvas(bounds.width, bounds.height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  for (const {topLeft, width, height} of margins) {
    ctx.fillRect(topLeft.x, topLeft.y, width, height);
  }
  return canvas;
}
