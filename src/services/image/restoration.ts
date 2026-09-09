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
import {offscreenCanvasToBlob} from '@/utils/graphics';

const RESTORATION_TILE_HALO = 64;
const RESTORATION_TILE_CORE_SIZE = 768;

export async function createRestoredImage({
  image,
  transparent,
  model,
  auth,
  progressCallback,
  signal,
}: {
  image: ImageBitmap;
  transparent: boolean;
  model: OnnxModel;
  auth: Authentication | null;
  progressCallback: FetchProgressCallback;
  signal: AbortSignal;
}): Promise<Blob> {
  // Channel attention pools over the whole tile, so tiles must cross-fade rather than butt.
  const canvas = await transformImageInTiles({
    image,
    model,
    modelScale: 1,
    outputScale: 1,
    coreSize: tileCoreSize(model, RESTORATION_TILE_CORE_SIZE, RESTORATION_TILE_HALO),
    halo: RESTORATION_TILE_HALO,
    feather: true,
    auth,
    progressCallback,
    signal,
  });
  if (transparent) {
    const ctx = canvas.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(image, 0, 0);
  }
  return await offscreenCanvasToBlob(canvas, {
    type: 'image/webp',
    quality: 1,
  });
}
