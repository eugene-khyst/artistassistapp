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

import {transfer} from 'comlink';

import {ColorMixer, PAPER_WHITE} from '~/src/services/color/color-mixer';
import type {RgbTuple} from '~/src/services/color/space/rgb';
import {packRgb, WHITE} from '~/src/services/color/space/rgb';
import type {ColorSet} from '~/src/services/color/types';
import type {SamplingPoint} from '~/src/services/image/sampling-point';
import {computeSamplingPoints} from '~/src/services/image/sampling-point';
import {clamp} from '~/src/services/math/clamp';
import {
  createImageBitmapResizedTotalPixels,
  IMAGE_SIZE,
  imageBitmapToImageData,
} from '~/src/utils/graphics';
import {computeIfAbsentInMap} from '~/src/utils/map';

import {quantizeColors, rgbTransformInOklab} from './filter/color-quantize';

const MAX_COLORS = 60;

interface Result {
  quantizedImage: ImageBitmap;
}

export class ColorQuantization {
  async getPosterizedImage(image: ImageBitmap, maxColors: number): Promise<Result> {
    console.time('posterize');
    const [resizedImage] = await createImageBitmapResizedTotalPixels(image, IMAGE_SIZE.SD);
    const [imageData] = imageBitmapToImageData(resizedImage);
    resizedImage.close();
    quantizeColors(imageData, maxColors);
    const quantizedImage: ImageBitmap = await createImageBitmap(imageData);
    console.timeEnd('posterize');
    return transfer({quantizedImage}, [quantizedImage]);
  }

  async getSamplingPoints(image: ImageBitmap): Promise<SamplingPoint[]> {
    console.time('sampling-points');
    const [resizedImage, scaleFactor] = await createImageBitmapResizedTotalPixels(
      image,
      IMAGE_SIZE.SD
    );
    const [imageData] = imageBitmapToImageData(resizedImage);
    resizedImage.close();
    quantizeColors(imageData, MAX_COLORS);
    const samplingPoints: SamplingPoint[] = computeSamplingPoints(imageData).map(
      ({x, y, ...rest}) => ({
        x: clamp(Math.round(x / scaleFactor), 0, image.width - 1),
        y: clamp(Math.round(y / scaleFactor), 0, image.height - 1),
        ...rest,
      })
    );
    console.timeEnd('sampling-points');
    return samplingPoints;
  }

  async getLimitedPaletteImage(image: ImageBitmap, colorSet: ColorSet): Promise<Result> {
    console.time('limited-palette');
    const colorMixer = new ColorMixer();
    colorMixer.setColorSet(colorSet, PAPER_WHITE);
    const [resizedImage] = await createImageBitmapResizedTotalPixels(image, IMAGE_SIZE.SD);
    const [imageData] = imageBitmapToImageData(resizedImage);
    resizedImage.close();

    const similarColors = new Map<number, RgbTuple>();
    quantizeColors(
      imageData,
      MAX_COLORS,
      true,
      rgbTransformInOklab(
        (color: RgbTuple): RgbTuple =>
          computeIfAbsentInMap(
            similarColors,
            packRgb(...color),
            () => colorMixer.findSimilarColor(color)?.colorMixture.layerRgb ?? WHITE
          )
      )
    );

    const quantizedImage: ImageBitmap = await createImageBitmap(imageData);
    console.timeEnd('limited-palette');
    return transfer({quantizedImage}, [quantizedImage]);
  }
}
