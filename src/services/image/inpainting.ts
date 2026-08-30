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

import type {Authentication} from '@/services/auth/types';
import {Polygon, Rectangle, Vector} from '@/services/math/geometry';
import {transformImage} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {FetchProgressCallback} from '@/utils/fetch';
import type {DrawImageSource} from '@/utils/graphics';

const OBJECTS_BOUNDING_BOX_PADDING = 32;

export async function inpaint(
  image: ImageBitmap,
  mask: DrawImageSource,
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  return transformImage({
    images: [image, mask],
    model,
    auth,
    progressCallback,
    signal,
  });
}

export function createObjectsMask(
  vertices: readonly Vector[],
  {width, height}: DrawImageSource
): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx: OffscreenCanvasRenderingContext2D = canvas.getContext('2d')!;
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

// The padding keeps the pasted edge outside the blended area around the mask.
export function objectsBoundingBox(
  vertices: readonly Vector[],
  {width, height}: DrawImageSource
): Rectangle {
  const {topLeft, bottomRight} = new Polygon(vertices)
    .getBoundingBox()
    .grow(OBJECTS_BOUNDING_BOX_PADDING);
  return new Rectangle(
    new Vector(
      clamp(Math.ceil(bottomRight.x), 0, width),
      clamp(Math.ceil(bottomRight.y), 0, height)
    ),
    new Vector(clamp(Math.floor(topLeft.x), 0, width), clamp(Math.floor(topLeft.y), 0, height))
  );
}
