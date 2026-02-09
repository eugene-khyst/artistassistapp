/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
import type {LimitedPalette} from '~/src/services/image/limited-palette';
import {WorkerManager} from '~/src/utils/worker-manager';

const limitedPaletteWorker = new WorkerManager<LimitedPalette>(
  () => new Worker(new URL('./limited-palette-worker.ts', import.meta.url), {type: 'module'})
);

export async function getLimitedPaletteImage(
  originalImageFile: File,
  limitedColorSet: ColorSet,
  signal?: AbortSignal
): Promise<ImageBitmap> {
  const {limitedPaletteImage} = await limitedPaletteWorker.run(
    worker => worker.getLimitedPaletteImage(originalImageFile, limitedColorSet),
    signal
  );
  return limitedPaletteImage;
}
