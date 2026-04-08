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

import type {RgbTuple} from '~/src/services/color/space/rgb';
import {colorMatchFilterWebGL} from '~/src/services/image/filter/color-match-webgl';
import type {KernelSize} from '~/src/services/image/filter/gaussian-blur-webgl';
import {sobelEdgeDetectionWebGL} from '~/src/services/image/filter/sobel-operator-webgl';
import {createImageBitmapResizedTotalPixels, IMAGE_SIZE, mergeImages} from '~/src/utils/graphics';

const COLOR_MATCH_DELTA_E_OK_THRESHOLD = 0.05;
const GAUSSIAN_BLUR_KERNEL_SIZE: KernelSize = 11;

export async function getColorMatchImage(
  image: ImageBitmap,
  color: RgbTuple
): Promise<ImageBitmap> {
  console.time('color-match');
  const [resizedImage] = await createImageBitmapResizedTotalPixels(image, IMAGE_SIZE['2K']);
  const outlineImage: ImageBitmap = sobelEdgeDetectionWebGL(
    resizedImage,
    GAUSSIAN_BLUR_KERNEL_SIZE
  );
  const colorMatchImage: ImageBitmap = colorMatchFilterWebGL(
    resizedImage,
    color,
    COLOR_MATCH_DELTA_E_OK_THRESHOLD
  );
  resizedImage.close();
  const mergedImage: ImageBitmap = mergeImages(outlineImage, colorMatchImage);
  colorMatchImage.close();
  outlineImage.close();
  console.timeEnd('color-match');
  return mergedImage;
}
