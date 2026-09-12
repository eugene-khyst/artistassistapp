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
import {DrawImage, drawImageToOffscreenCanvas, IMAGE_SIZE, padTile} from '@/utils/graphics';

export interface TileSpan {
  start: number;
  end: number;
  paddedStart: number;
  paddedEnd: number;
}

export function tileSpans(size: number, coreSize: number, halo: number): TileSpan[] {
  const count = Math.ceil(size / coreSize);
  return Array.from({length: count}, (_, index): TileSpan => {
    const start = Math.round((index * size) / count);
    const end = Math.round(((index + 1) * size) / count);
    return {
      start,
      end,
      paddedStart: Math.max(0, start - halo),
      paddedEnd: Math.min(size, end + halo),
    };
  });
}

// A tile over the model budget would be resized, so the default matches the model input default.
export function tileCoreSize(
  {maxPixelCount = IMAGE_SIZE.SD}: OnnxModel,
  halo: number,
  maxCoreSize = Infinity
): number {
  return Math.max(1, Math.min(maxCoreSize, Math.floor(Math.sqrt(maxPixelCount)) - 2 * halo));
}

function scaleTile(
  tile: OffscreenCanvas,
  modelScale: number,
  outputScale: number
): OffscreenCanvas {
  return outputScale === modelScale
    ? tile
    : interpolationWebGL(
        tile,
        (outputScale * tile.width) / modelScale,
        (outputScale * tile.height) / modelScale,
        Interpolation.Lanczos
      );
}

// Ramps the leading edges to nothing, so the already drawn neighbour fades through.
function featherTile(tile: OffscreenCanvas, left: number, top: number): void {
  const ctx = tile.getContext('2d')!;
  ctx.globalCompositeOperation = 'destination-in';
  if (left) {
    const gradient = ctx.createLinearGradient(0, 0, left, 0);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgb(0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, tile.width, tile.height);
  }
  if (top) {
    const gradient = ctx.createLinearGradient(0, 0, 0, top);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgb(0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, tile.width, tile.height);
  }
}

export async function transformImageInTiles({
  image,
  model,
  modelScale,
  outputScale,
  coreSize,
  halo,
  feather = false,
  auth,
  progressCallback,
  signal,
}: {
  image: ImageBitmap;
  model: OnnxModel;
  modelScale: number;
  outputScale: number;
  coreSize: number;
  halo: number;
  feather?: boolean;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<OffscreenCanvas> {
  const {width, height} = image;
  const columns = tileSpans(width, coreSize, halo);
  const rows = tileSpans(height, coreSize, halo);
  const total = columns.length * rows.length;
  const canvas = new OffscreenCanvas(outputScale * width, outputScale * height);
  const ctx = canvas.getContext('2d')!;
  await withInferenceSession(
    model.url,
    auth,
    async run => {
      let tile = 0;
      for (const row of rows) {
        for (const column of columns) {
          progressCallback(PROCESSING_PROGRESS_KEY, (100 * tile++) / total);
          const [tileImage] = drawImageToOffscreenCanvas(image, {
            drawImage: DrawImage.cropRectangle(
              Rectangle.fromTopLeft(
                new Vector(column.paddedStart, row.paddedStart),
                column.paddedEnd - column.paddedStart,
                row.paddedEnd - row.paddedStart
              )
            ),
          });
          // Pad the tile so the model never resizes it and the output stays on whole pixels.
          const transformedTile = await transformImageInSession({
            images: [padTile(tileImage, model.inputSizeMultiple)],
            model,
            run,
            interpolation: null,
          });
          signal.throwIfAborted();
          const scaledTile = scaleTile(transformedTile, modelScale, outputScale);
          if (feather) {
            featherTile(
              scaledTile,
              2 * outputScale * (column.start - column.paddedStart),
              2 * outputScale * (row.start - row.paddedStart)
            );
          }
          const [left, right] = feather
            ? [column.paddedStart, column.paddedEnd]
            : [column.start, column.end];
          const [top, bottom] = feather ? [row.paddedStart, row.paddedEnd] : [row.start, row.end];
          const tileWidth = outputScale * (right - left);
          const tileHeight = outputScale * (bottom - top);
          ctx.drawImage(
            scaledTile,
            outputScale * (left - column.paddedStart),
            outputScale * (top - row.paddedStart),
            tileWidth,
            tileHeight,
            outputScale * left,
            outputScale * top,
            tileWidth,
            tileHeight
          );
        }
      }
    },
    progressCallback,
    signal
  );
  return canvas;
}
