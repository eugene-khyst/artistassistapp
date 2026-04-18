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
import {computeOtsuThreshold} from '~/src/services/image/filter/otsu-threshold';
import {sobelEdgeDetectionWebGL} from '~/src/services/image/filter/sobel-edge-detection-webgl';
import {thresholdFilterWebGL} from '~/src/services/image/filter/threshold-webgl';
import type {DrawImageSource} from '~/src/utils/graphics';
import {mergeImages, offscreenCanvasToImageData} from '~/src/utils/graphics';

const COLOR_MATCH_DELTA_E_OK_THRESHOLD = 0.05;

export function getColorMatchImage(image: DrawImageSource, color: RgbTuple): ImageBitmap {
  console.time('color-match');
  const colorMatchImage: OffscreenCanvas = colorMatchFilterWebGL(
    image,
    color,
    COLOR_MATCH_DELTA_E_OK_THRESHOLD
  );
  const sobelImage: OffscreenCanvas = sobelEdgeDetectionWebGL(image);
  const threshold = computeOtsuThreshold(offscreenCanvasToImageData(sobelImage), true);
  const [thresholdImage] = thresholdFilterWebGL(sobelImage, [threshold], [0.5], true);
  mergeImages(thresholdImage!, colorMatchImage);
  console.timeEnd('color-match');
  return thresholdImage!.transferToImageBitmap();
}
