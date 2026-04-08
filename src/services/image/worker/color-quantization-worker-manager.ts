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
import type {SamplingPoint} from '~/src/services/image/sampling-point';
import {WorkerManager} from '~/src/utils/worker-manager';

const colorQuantizationWorker = new WorkerManager<ColorQuantization>(
  () => new Worker(new URL('./color-quantization-worker.ts', import.meta.url), {type: 'module'})
);

export async function getPosterizedImage(
  image: ImageBitmap,
  maxColors: number,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {quantizedImage} = await colorQuantizationWorker.run(
    worker => worker.getPosterizedImage(image, maxColors),
    signal
  );
  return quantizedImage;
}

export async function getSamplingPoints(
  image: ImageBitmap,
  signal?: AbortSignal
): Promise<SamplingPoint[]> {
  const samplingPoints: SamplingPoint[] = await colorQuantizationWorker.run(
    worker => worker.getSamplingPoints(image),
    signal
  );
  return samplingPoints;
}

export async function getLimitedPaletteImage(
  image: ImageBitmap,
  limitedColorSet: ColorSet,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {quantizedImage} = await colorQuantizationWorker.run(
    worker => worker.getLimitedPaletteImage(image, limitedColorSet),
    signal
  );
  return quantizedImage;
}
