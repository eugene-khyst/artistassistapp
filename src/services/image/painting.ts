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
import horizontalBrushUrl from '@/services/image/brushes/horizontal.png?url';
import verticalBrushUrl from '@/services/image/brushes/vertical.png?url';
import {renderBrushStrokesWebGL} from '@/services/image/filter/brush-stroke-webgl';
import {imageBitmapToImageData} from '@/services/ml/image-transformer';
import {type Float32Tensor, imageDataToFloat32Tensor} from '@/services/ml/tensor';
import type {OnnxModel} from '@/services/ml/types';
import {withInferenceSession} from '@/services/ml/worker/inference-worker-manager';
import {type FetchProgressCallback, PROCESSING_PROGRESS_KEY} from '@/utils/fetch';
import {
  DrawImage,
  type DrawImageSource,
  drawImageToOffscreenCanvas,
  getRgbaForCoord,
  imageDataToOffscreenCanvas,
  offscreenCanvasToImageData,
  padTile,
  toOffscreenCanvas,
} from '@/utils/graphics';

export const PAINTING_PATCH_SIZES = {small: 128, medium: 96, large: 64} as const;
export type PaintingPatchSize = (typeof PAINTING_PATCH_SIZES)[keyof typeof PAINTING_PATCH_SIZES];

const PAINTING_MAX_SIDE = 512;
const STROKE_PADDING = 32;

export async function paintImage(
  image: DrawImageSource,
  model: OnnxModel,
  auth: Authentication | null,
  patchSize: PaintingPatchSize = PAINTING_PATCH_SIZES.large,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<OffscreenCanvas> {
  signal?.throwIfAborted();
  const overlap = patchSize / 2;
  const [canvas] = drawImageToOffscreenCanvas(image, {
    drawImage: DrawImage.resizeToLongestSide(PAINTING_MAX_SIDE),
    fillStyle: '#fff',
  });
  const padded = padTile(canvas, patchSize);
  const source = offscreenCanvasToImageData(padded);
  const columns = padded.width / patchSize;
  const rows = padded.height / patchSize;
  const strokes: Float32Tensor[] = [];
  await withInferenceSession(
    model.url,
    auth,
    async run => {
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          signal?.throwIfAborted();
          progressCallback?.(PROCESSING_PROGRESS_KEY, (100 * strokes.length) / (rows * columns));
          const patch = createPatch(
            source,
            column * patchSize,
            row * patchSize,
            patchSize,
            overlap
          );
          const [input] = imageBitmapToImageData([patch], model);
          const [output] = await run([[imageDataToFloat32Tensor(input!, model)]], model.outputName);
          if (!output) {
            throw new Error('Painting model returned no strokes');
          }
          strokes.push(output);
        }
      }
    },
    progressCallback,
    signal
  );
  const [vertical, horizontal] = await Promise.all([
    loadBrush(verticalBrushUrl, signal),
    loadBrush(horizontalBrushUrl, signal),
  ]);
  signal?.throwIfAborted();
  const resolution = Array.isArray(model.resolution) ? model.resolution[0] : model.resolution!;
  return renderBrushStrokesWebGL(strokes, {vertical, horizontal}, canvas, {
    patchSize,
    overlap,
    strokeScale: 1 - STROKE_PADDING / resolution,
  });
}

function createPatch(
  source: ImageData,
  x: number,
  y: number,
  patchSize: number,
  overlap: number
): OffscreenCanvas {
  const size = patchSize + overlap;
  const patch = new ImageData(size, size);
  for (let py = 0; py < size; py++) {
    const sy = reflect(y + py - overlap / 2, source.height);
    for (let px = 0; px < size; px++) {
      const sx = reflect(x + px - overlap / 2, source.width);
      patch.data.set(getRgbaForCoord(source.data, sx, sy, source.width), (py * size + px) * 4);
    }
  }
  return imageDataToOffscreenCanvas(patch);
}

function reflect(coordinate: number, size: number): number {
  if (coordinate < 0) {
    return -coordinate;
  }
  return coordinate >= size ? 2 * size - coordinate - 2 : coordinate;
}

async function loadBrush(url: string, signal?: AbortSignal): Promise<OffscreenCanvas> {
  const response = await fetch(url, {signal});
  if (!response.ok) {
    throw new Error('Failed to load painting brush');
  }
  // Brush intensities are model data; the embedded color profile must not change them.
  const bitmap = await createImageBitmap(await response.blob(), {colorSpaceConversion: 'none'});
  try {
    return toOffscreenCanvas(bitmap);
  } finally {
    bitmap.close();
  }
}
