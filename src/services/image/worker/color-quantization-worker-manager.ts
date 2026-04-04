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

import type {ColorSet} from '~/src/services/color/types';
import type {ColorQuantization} from '~/src/services/image/color-quantization';
import {WorkerManager} from '~/src/utils/worker-manager';

const colorQuantizationWorker = new WorkerManager<ColorQuantization>(
  () => new Worker(new URL('./color-quantization-worker.ts', import.meta.url), {type: 'module'})
);

export async function getPosterizedImage(
  originalImageFile: File,
  quantizationDepth: number,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {quantizedImage} = await colorQuantizationWorker.run(
    worker => worker.getPosterizedImage(originalImageFile, quantizationDepth),
    signal
  );
  return quantizedImage;
}

export async function getLimitedPaletteImage(
  originalImageFile: File,
  limitedColorSet: ColorSet,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {quantizedImage} = await colorQuantizationWorker.run(
    worker => worker.getLimitedPaletteImage(originalImageFile, limitedColorSet),
    signal
  );
  return quantizedImage;
}
