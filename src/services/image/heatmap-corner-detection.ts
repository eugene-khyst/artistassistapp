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

import type {Authentication} from '~/src/services/auth/types';
import {bilinearInterpolation} from '~/src/services/image/filter/interpolation';
import {computeOtsuThresholdFromHistogram} from '~/src/services/image/filter/otsu-threshold';
import {orderCornersClockwise, Vector} from '~/src/services/math/geometry';
import {imageBitmapToImageData} from '~/src/services/ml/image-transformer';
import {type Float32Tensor, imageDataToFloat32Tensor} from '~/src/services/ml/tensor';
import type {OnnxModel} from '~/src/services/ml/types';
import {runInferenceWorker} from '~/src/services/ml/worker/inference-worker-manager';
import type {FetchProgressCallback} from '~/src/utils/fetch';
import {clamp} from '~/src/utils/math-utils';

const HEATMAP_THRESHOLD = 0.3;
const MIN_VERTEX_COUNT = 3;

// 8-connectivity neighbour offsets in clockwise order: E, SE, S, SW, W, NW, N, NE.
const NEIGHBOR_OFFSETS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const;

export async function detectDocumentCornersHeatmap(
  image: ImageBitmap,
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<Vector[] | null> {
  console.time('detect-document-corners');
  const [imageData] = imageBitmapToImageData([image], model);
  const inputTensor = imageDataToFloat32Tensor(imageData!, model);
  const [outputTensor] = await runInferenceWorker(
    model.url,
    auth,
    [[inputTensor]],
    model.outputName,
    progressCallback,
    signal
  );
  const corners: Vector[] = heatmapTensorToCorners(outputTensor!, image.width, image.height).filter(
    (corner): corner is Vector => !!corner
  );
  console.timeEnd('detect-document-corners');
  if (corners.length !== 4) {
    return null;
  }
  return orderCornersClockwise(corners);
}

function heatmapTensorToCorners(
  {data, dims}: Float32Tensor,
  origWidth: number,
  origHeight: number
): (Vector | null)[] {
  const [, channels = 4, hmHeight = 0, hmWidth = 0] = dims;
  const channelStride = hmHeight * hmWidth;
  const corners: (Vector | null)[] = [];
  for (let c = 0; c < channels; c++) {
    const channel = data.subarray(c * channelStride, (c + 1) * channelStride);
    const upscaled = bilinearInterpolation(channel, hmWidth, hmHeight, origWidth, origHeight);
    corners.push(extractCorner(upscaled, origWidth, origHeight));
  }
  return corners;
}

function extractCorner(channel: Float32Array, width: number, height: number): Vector | null {
  const length = width * height;
  const mask = new Uint8Array(length);
  const hist = new Int32Array(256);
  let nonzero = 0;
  for (let i = 0; i < length; i++) {
    const v = channel[i]!;
    const value = v < HEATMAP_THRESHOLD ? 0 : clamp(Math.floor(v * 255), 0, 255);
    mask[i] = value;
    hist[value]!++;
    if (value > 0) {
      nonzero++;
    }
  }
  if (nonzero === 0) {
    return null;
  }
  const otsu = computeOtsuThresholdFromHistogram(hist, length);
  for (let i = 0; i < length; i++) {
    mask[i] = mask[i]! > otsu ? 1 : 0;
  }
  const contours = findExternalContours(mask, width, height).filter(
    contour => contour.length >= MIN_VERTEX_COUNT
  );
  if (contours.length === 0) {
    return null;
  }
  // Compare by |area| — `polygonArea` is signed (image-coord trace is normally positive
  // but self-intersecting shapes can flip sign). Skip degenerate zero-area contours.
  let bestContour: Vector[] = [];
  let bestArea = 0;
  for (const contour of contours) {
    const area = Math.abs(polygonArea(contour));
    if (area > bestArea) {
      bestArea = area;
      bestContour = contour;
    }
  }
  if (bestArea === 0) {
    return null;
  }
  return polygonCentroid(bestContour);
}

// Mutates `mask`: each blob is cleared (set to 0) after its boundary is traced.
function findExternalContours(mask: Uint8Array, width: number, height: number): Vector[][] {
  const contours: Vector[][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx] === 0) {
        continue;
      }
      contours.push(traceOuterContour(mask, width, height, x, y));
      clearBlob(mask, width, height, x, y);
    }
  }
  return contours;
}

// Moore-Neighbor 8-conn trace: walk the outer boundary back to the start.
function traceOuterContour(
  mask: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number
): Vector[] {
  const contour: Vector[] = [new Vector(startX, startY)];
  let curX = startX;
  let curY = startY;
  let backtrackDir = 4; // entered the start pixel from the west
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (let step = 1; step <= 8; step++) {
      const dir = (backtrackDir + step) % 8;
      const [dx, dy] = NEIGHBOR_OFFSETS[dir]!;
      const nx = curX + dx;
      const ny = curY + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || mask[ny * width + nx] === 0) {
        continue;
      }
      if (nx === startX && ny === startY) {
        break;
      }
      contour.push(new Vector(nx, ny));
      backtrackDir = (dir + 4) % 8;
      curX = nx;
      curY = ny;
      advanced = true;
      break;
    }
  }
  return contour;
}

// 8-conn — must match traceOuterContour, otherwise a diagonal neighbour stays
// unmarked and the next raster scan re-traces pixels of an already-found blob.
function clearBlob(
  mask: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number
): void {
  const stack: number[] = [];
  const startIdx = startY * width + startX;
  stack.push(startIdx);
  mask[startIdx] = 0;
  while (stack.length > 0) {
    const idx = stack.pop()!;
    const y = Math.trunc(idx / width);
    const x = idx - y * width;
    const xLeft = x > 0;
    const xRight = x + 1 < width;
    const yUp = y > 0;
    const yDown = y + 1 < height;
    if (xLeft) {
      const i = idx - 1;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
    if (xRight) {
      const i = idx + 1;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
    if (yUp) {
      const i = idx - width;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
    if (yDown) {
      const i = idx + width;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
    if (xLeft && yUp) {
      const i = idx - 1 - width;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
    if (xRight && yUp) {
      const i = idx + 1 - width;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
    if (xLeft && yDown) {
      const i = idx - 1 + width;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
    if (xRight && yDown) {
      const i = idx + 1 + width;
      if (mask[i] !== 0) {
        mask[i] = 0;
        stack.push(i);
      }
    }
  }
}

// Shoelace formula (Green's theorem).
function polygonArea(contour: Vector[]): number {
  let signedTwiceArea = 0;
  const n = contour.length;
  for (let i = 0; i < n; i++) {
    const p = contour[i]!;
    const q = contour[(i + 1) % n]!;
    signedTwiceArea += p.x * q.y - q.x * p.y;
  }
  return signedTwiceArea / 2;
}

// 1st-order moments via Green's theorem.
function polygonCentroid(contour: Vector[]): Vector {
  let sumA = 0;
  let sumX = 0;
  let sumY = 0;
  const n = contour.length;
  for (let i = 0; i < n; i++) {
    const p = contour[i]!;
    const q = contour[(i + 1) % n]!;
    const cross = p.x * q.y - q.x * p.y;
    sumA += cross;
    sumX += (p.x + q.x) * cross;
    sumY += (p.y + q.y) * cross;
  }
  const m00 = sumA / 2;
  const m10 = sumX / 6;
  const m01 = sumY / 6;
  return new Vector(m10 / (m00 + 1e-5), m01 / (m00 + 1e-5));
}
