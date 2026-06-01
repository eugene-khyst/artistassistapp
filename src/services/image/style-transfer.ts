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
import {transformImage} from '@/services/ml/image-transformer';
import type {OnnxModel} from '@/services/ml/types';
import type {FetchProgressCallback} from '@/utils/fetch';
import type {DrawImageSource} from '@/utils/graphics';

export async function transferStyle(
  images: DrawImageSource[],
  model: OnnxModel,
  auth: Authentication | null,
  progressCallback?: FetchProgressCallback,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  console.time('style-transfer');
  const transformedImage: ImageBitmap = await transformImage(
    images,
    model,
    auth,
    progressCallback,
    signal
  );
  console.timeEnd('style-transfer');
  return transformedImage;
}
