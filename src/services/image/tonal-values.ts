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

import {thresholdFilterWebGL} from '~/src/services/image/filter/threshold-webgl';
import {createImageBitmapScaledTotalPixels, IMAGE_SIZE} from '~/src/utils/graphics';

export async function getTonalValues(
  blob: Blob,
  thresholds: [number, number, number] = [0.825, 0.6, 0.35]
): Promise<ImageBitmap[]> {
  console.time('tonal-values');
  const image: ImageBitmap = await createImageBitmapScaledTotalPixels(blob, IMAGE_SIZE.HD);
  thresholds.sort((a: number, b: number) => b - a);
  const tonalValues: ImageBitmap[] = thresholdFilterWebGL(image, thresholds);
  image.close();
  console.timeEnd('tonal-values');
  return tonalValues;
}
