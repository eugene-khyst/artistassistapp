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

import {transfer} from 'comlink';

import {ColorMixer, PAPER_WHITE_HEX} from '~/src/services/color/color-mixer';
import type {RgbTuple} from '~/src/services/color/space/rgb';
import {Rgb, rgbToNumber} from '~/src/services/color/space/rgb';
import type {ColorSet} from '~/src/services/color/types';
import {
  createImageBitmapResizedTotalPixels,
  IMAGE_SIZE,
  imageBitmapToImageData,
} from '~/src/utils/graphics';
import {computeIfAbsentInMap} from '~/src/utils/map';

import {medianCutQuantization} from './filter/median-cut';

const QUANTIZATION_DEPTH = 9;

interface Result {
  preview: ImageBitmap;
}

export class LimitedPalette {
  async getPreview(blob: Blob, colorSet: ColorSet): Promise<Result> {
    console.time('limited-palette');
    const colorMixer = new ColorMixer();
    colorMixer.setColorSet(colorSet, PAPER_WHITE_HEX);
    const image: ImageBitmap = await createImageBitmapResizedTotalPixels(blob, IMAGE_SIZE.SD);
    const [imageData] = imageBitmapToImageData(image);
    image.close();
    const similarColors = new Map<number, RgbTuple>();
    medianCutQuantization(imageData, QUANTIZATION_DEPTH, (mean: RgbTuple): RgbTuple => {
      return computeIfAbsentInMap(similarColors, rgbToNumber(mean), () => {
        const similarColor = colorMixer.findSimilarColor(mean);
        return similarColor?.colorMixture.layerRgb ?? Rgb.WHITE.toRgbTuple();
      });
    });
    const preview: ImageBitmap = await createImageBitmap(imageData);
    console.timeEnd('limited-palette');
    return transfer({preview}, [preview]);
  }
}
