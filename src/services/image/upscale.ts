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
import {interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {Interpolation} from '@/services/image/filter/types';
import {Rectangle, Vector} from '@/services/math/geometry';
import {transformImageInSession} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import {withInferenceSession} from '@/services/ml/worker/inference-worker-manager';
import {type FetchProgressCallback, PROCESSING_PROGRESS_KEY} from '@/utils/fetch';
import {
  DrawImage,
  drawImageToOffscreenCanvas,
  type ImageDimension,
  offscreenCanvasToBlob,
} from '@/utils/graphics';

const UPSCALE_MODEL_SCALE = 4;
const UPSCALE_TILE_HALO = 48;
const UPSCALE_TILE_CORE_SIZE = 512;
const UPSCALE_TILE_PIXELS = (UPSCALE_TILE_CORE_SIZE + 2 * UPSCALE_TILE_HALO) ** 2;

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

export interface UpscaleTileSpan {
  start: number;
  end: number;
  paddedStart: number;
  paddedEnd: number;
}

export function upscaleTileSpans(size: number, coreSize: number): UpscaleTileSpan[] {
  const count = Math.ceil(size / coreSize);
  return Array.from({length: count}, (_, index): UpscaleTileSpan => {
    const start = Math.round((index * size) / count);
    const end = Math.round(((index + 1) * size) / count);
    return {
      start,
      end,
      paddedStart: Math.max(0, start - UPSCALE_TILE_HALO),
      paddedEnd: Math.min(size, end + UPSCALE_TILE_HALO),
    };
  });
}

// A tile over the model budget would be resized.
export function upscaleTileCoreSize({maxPixelCount = UPSCALE_TILE_PIXELS}: OnnxModel): number {
  return Math.max(
    1,
    Math.min(UPSCALE_TILE_CORE_SIZE, Math.floor(Math.sqrt(maxPixelCount)) - 2 * UPSCALE_TILE_HALO)
  );
}

function tileRectangle(column: UpscaleTileSpan, row: UpscaleTileSpan): Rectangle {
  return Rectangle.fromTopLeft(
    new Vector(column.paddedStart, row.paddedStart),
    column.paddedEnd - column.paddedStart,
    row.paddedEnd - row.paddedStart
  );
}

function scaleTile(tile: OffscreenCanvas, factor: number): OffscreenCanvas {
  return factor === UPSCALE_MODEL_SCALE
    ? tile
    : interpolationWebGL(
        tile,
        (factor * tile.width) / UPSCALE_MODEL_SCALE,
        (factor * tile.height) / UPSCALE_MODEL_SCALE,
        Interpolation.Lanczos
      );
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
  const {width, height} = image;
  const coreSize = upscaleTileCoreSize(model);
  const columns = upscaleTileSpans(width, coreSize);
  const rows = upscaleTileSpans(height, coreSize);
  const total = columns.length * rows.length;
  const canvas = new OffscreenCanvas(factor * width, factor * height);
  const ctx = canvas.getContext('2d')!;
  await withInferenceSession(
    model.url,
    auth,
    async run => {
      let tile = 0;
      for (const row of rows) {
        for (const column of columns) {
          progressCallback(PROCESSING_PROGRESS_KEY, (100 * ++tile) / total);
          const [tileImage] = drawImageToOffscreenCanvas(image, {
            drawImage: DrawImage.cropRectangle(tileRectangle(column, row)),
          });
          const upscaledTile = await transformImageInSession({
            images: [tileImage],
            model,
            run,
            interpolation: null,
          });
          signal.throwIfAborted();
          const tileWidth = factor * (column.end - column.start);
          const tileHeight = factor * (row.end - row.start);
          ctx.drawImage(
            scaleTile(upscaledTile, factor),
            factor * (column.start - column.paddedStart),
            factor * (row.start - row.paddedStart),
            tileWidth,
            tileHeight,
            factor * column.start,
            factor * row.start,
            tileWidth,
            tileHeight
          );
        }
      }
    },
    progressCallback,
    signal
  );
  if (transparent) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }
  return await offscreenCanvasToBlob(canvas, {
    type: 'image/webp',
    quality: 1,
  });
}
