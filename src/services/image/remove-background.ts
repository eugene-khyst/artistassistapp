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

import {interpolationWebGL} from '@eugene-khyst/artistassistapp-image-processing/filter/interpolation-webgl';
import {Interpolation} from '@eugene-khyst/artistassistapp-image-processing/filter/types';
import {
  applyMask,
  type DrawImageSource,
  toOffscreenCanvas,
} from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';

import type {Authentication} from '@/services/auth/types';
import {transformImage} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {FetchProgressCallback} from '@/utils/fetch';

export async function createBackgroundMask(
  image: ImageBitmap,
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<OffscreenCanvas> {
  return transformImage({
    images: [image],
    model,
    auth,
    progressCallback,
    signal,
    interpolation: null,
  });
}

export function removeBackground(image: DrawImageSource, mask: ImageBitmap): OffscreenCanvas {
  return applyMask(
    image,
    interpolationWebGL(toOffscreenCanvas(mask), image.width, image.height, Interpolation.Bilinear)
  );
}
