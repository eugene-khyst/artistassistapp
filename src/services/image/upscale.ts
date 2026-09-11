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

import type {Authentication} from '@/services/auth/types';
import {tileCoreSize, transformImageInTiles} from '@/services/ml/tiled-image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {FetchProgressCallback} from '@/utils/fetch';
import {type ImageDimension, offscreenCanvasToBlob} from '@/utils/graphics';

const UPSCALE_MODEL_SCALE = 4;
const UPSCALE_TILE_HALO = 48;
const UPSCALE_TILE_CORE_SIZE = 512;

const UPSCALE_FACTORS = [4, 2];

export const MAX_UPSCALE_OUTPUT_PIXELS = 4000 * 4000;
export const MAX_UPSCALE_OUTPUT_SIDE = 8192;

export function upscaleFactor({width, height}: ImageDimension): number | null {
  return (
    UPSCALE_FACTORS.find(
      factor =>
        factor * factor * width * height <= MAX_UPSCALE_OUTPUT_PIXELS &&
        factor * Math.max(width, height) <= MAX_UPSCALE_OUTPUT_SIDE
    ) ?? null
  );
}

export function upscaledSize(size: ImageDimension): ImageDimension | null {
  const factor = upscaleFactor(size);
  return factor ? {width: factor * size.width, height: factor * size.height} : null;
}

export async function createUpscaledImage({
  image,
  factor,
  transparent,
  model,
  auth,
  progressCallback,
  signal,
}: {
  image: ImageBitmap;
  factor: number;
  transparent: boolean;
  model: OnnxModel;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<Blob> {
  const canvas = await transformImageInTiles({
    image,
    model,
    modelScale: UPSCALE_MODEL_SCALE,
    outputScale: factor,
    coreSize: tileCoreSize(model, UPSCALE_TILE_HALO, UPSCALE_TILE_CORE_SIZE),
    halo: UPSCALE_TILE_HALO,
    auth,
    progressCallback,
    signal,
  });
  if (transparent) {
    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  return await offscreenCanvasToBlob(canvas, {
    type: 'image/webp',
    quality: 1,
  });
}
