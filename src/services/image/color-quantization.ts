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
  deltaEOKr2,
  packRgb,
  PAPER_WHITE,
  rgbToOklab,
  type RgbTuple,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {transfer} from 'comlink';

import {computeSamplingPoints, type SamplingPoint} from '@/services/image/sampling-point';
import {drawImageToOffscreenCanvas, offscreenCanvasToImageData} from '@/utils/graphics';

import {quantizeColors, rgbTransformInOklab} from './filter/color-quantize';

const MAX_COLORS = 60;

interface Result {
  quantizedImage: ImageBitmap;
}

// The worker owns the transferred bitmap, so it is released even when reading it fails.
function readImageData(image: ImageBitmap): ImageData {
  try {
    return offscreenCanvasToImageData(
      ...drawImageToOffscreenCanvas(image, {
        willReadFrequently: true,
        fillStyle: '#fff',
      })
    );
  } finally {
    image.close();
  }
}

export class ColorQuantization {
  async getPosterizedImage(image: ImageBitmap, maxColors: number): Promise<Result> {
    const imageData: ImageData = readImageData(image);
    quantizeColors(imageData, maxColors);
    const quantizedImage: ImageBitmap = await createImageBitmap(imageData);
    return transfer({quantizedImage}, [quantizedImage]);
  }

  getSamplingPoints(image: ImageBitmap): SamplingPoint[] {
    const imageData: ImageData = readImageData(image);
    quantizeColors(imageData, MAX_COLORS);
    const samplingPoints: SamplingPoint[] = computeSamplingPoints(imageData);
    return samplingPoints;
  }

  async getLimitedPaletteImage(image: ImageBitmap, colorSet: ColorSet): Promise<Result> {
    const colorMixer = new ColorMixer();
    colorMixer.setColorSet({colorSet});
    const imageData: ImageData = readImageData(image);
    const matchedColors = new Map<number, RgbTuple>();
    const surfaceOklab = rgbToOklab(...PAPER_WHITE);
    quantizeColors(
      imageData,
      MAX_COLORS,
      true,
      rgbTransformInOklab((color: RgbTuple): RgbTuple =>
        computeIfAbsentInMap(matchedColors, packRgb(...color), () => {
          const match = colorMixer.findBestAvailableColorMatch(color, true);
          const surfaceDeltaE = deltaEOKr2(...rgbToOklab(...color), ...surfaceOklab);
          return match && match.deltaEOKr2 < surfaceDeltaE
            ? match.colorMixture.layerRgb
            : PAPER_WHITE;
        })
      )
    );
    const quantizedImage: ImageBitmap = await createImageBitmap(imageData);
    return transfer({quantizedImage}, [quantizedImage]);
  }
}
