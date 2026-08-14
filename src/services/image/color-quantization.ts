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

import {
  ColorMixer,
  type ColorSet,
  computeIfAbsentInMap,
  packRgb,
  type RgbTuple,
  WHITE,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {transfer} from 'comlink';

import {computeSamplingPoints, type SamplingPoint} from '@/services/image/sampling-point';
import {drawImageToOffscreenCanvas, offscreenCanvasToImageData} from '@/utils/graphics';

import {quantizeColors, rgbTransformInOklab} from './filter/color-quantize';

const MAX_COLORS = 60;

interface Result {
  quantizedImage: ImageBitmap;
}

export class ColorQuantization {
  async getPosterizedImage(image: ImageBitmap, maxColors: number): Promise<Result> {
    console.time('posterize');
    const imageData: ImageData = offscreenCanvasToImageData(
      ...drawImageToOffscreenCanvas(image, {
        willReadFrequently: true,
      })
    );
    image.close();
    quantizeColors(imageData, maxColors);
    const quantizedImage: ImageBitmap = await createImageBitmap(imageData);
    console.timeEnd('posterize');
    return transfer({quantizedImage}, [quantizedImage]);
  }

  getSamplingPoints(image: ImageBitmap): SamplingPoint[] {
    console.time('sampling-points');
    const imageData: ImageData = offscreenCanvasToImageData(
      ...drawImageToOffscreenCanvas(image, {
        willReadFrequently: true,
      })
    );
    image.close();
    quantizeColors(imageData, MAX_COLORS);
    const samplingPoints: SamplingPoint[] = computeSamplingPoints(imageData);
    console.timeEnd('sampling-points');
    return samplingPoints;
  }

  async getLimitedPaletteImage(image: ImageBitmap, colorSet: ColorSet): Promise<Result> {
    console.time('limited-palette');
    const colorMixer = new ColorMixer();
    colorMixer.setColorSet({colorSet});
    const imageData: ImageData = offscreenCanvasToImageData(
      ...drawImageToOffscreenCanvas(image, {
        willReadFrequently: true,
      })
    );
    image.close();
    const matchedColors = new Map<number, RgbTuple>();
    quantizeColors(
      imageData,
      MAX_COLORS,
      true,
      rgbTransformInOklab((color: RgbTuple): RgbTuple =>
        computeIfAbsentInMap(
          matchedColors,
          packRgb(...color),
          () => colorMixer.findBestAvailableColorMatch(color, true)?.colorMixture.layerRgb ?? WHITE
        )
      )
    );
    const quantizedImage: ImageBitmap = await createImageBitmap(imageData);
    console.timeEnd('limited-palette');
    return transfer({quantizedImage}, [quantizedImage]);
  }
}
