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
import {transformImage} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {FetchProgressCallback} from '@/utils/fetch';
import type {ImageDimension} from '@/utils/graphics';

export const INPAINTING_UPSCALE_MIN_SCALE_FACTOR = 1.5;

export function shouldUpscaleInpaintedImage(
  source: ImageDimension,
  target: ImageDimension
): boolean {
  const scaleFactor = Math.max(target.width / source.width, target.height / source.height);
  return scaleFactor >= INPAINTING_UPSCALE_MIN_SCALE_FACTOR;
}

export async function inpaintImage({
  images,
  target,
  inpaintModel,
  upscaleModel,
  auth,
  progressCallback,
  signal,
}: {
  images: [OffscreenCanvas, OffscreenCanvas];
  target: ImageDimension;
  inpaintModel: OnnxModel;
  upscaleModel: OnnxModel;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<OffscreenCanvas> {
  const inpaintedImage = await transformImage({
    images,
    model: inpaintModel,
    auth,
    progressCallback,
    signal,
    interpolation: null,
  });
  signal.throwIfAborted();
  let upscaledImage: OffscreenCanvas | undefined;
  if (shouldUpscaleInpaintedImage(inpaintedImage, target)) {
    upscaledImage = await transformImage({
      images: [inpaintedImage],
      model: upscaleModel,
      auth,
      progressCallback,
      signal,
      interpolation: null,
    });
    signal.throwIfAborted();
  }
  return interpolationWebGL(
    upscaledImage ?? inpaintedImage,
    target.width,
    target.height,
    Interpolation.Lanczos
  );
}
