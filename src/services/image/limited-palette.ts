/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';

import type {ColorSet} from '~/src/services/color';
import {ColorMixer, PAPER_WHITE_HEX} from '~/src/services/color';
import type {RgbTuple} from '~/src/services/color/space';
import {Rgb} from '~/src/services/color/space';
import {
  computeIfAbsentInMap,
  createScaledImageBitmap,
  IMAGE_SIZE,
  imageBitmapToOffscreenCanvas,
} from '~/src/utils';

import {medianCutQuantization} from './median-cut';

const QUANTIZATION_DEPTH = 11;

interface Result {
  preview: ImageBitmap;
}

export class LimitedPalette {
  async getPreview(blob: Blob, colorSet: ColorSet): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('limited-palette');
    }
    const colorMixer = new ColorMixer();
    colorMixer.setColorSet(colorSet, PAPER_WHITE_HEX);
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.SD);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const similarColors = new Map<number, RgbTuple>();
    medianCutQuantization(imageData, QUANTIZATION_DEPTH, (mean: RgbTuple): RgbTuple => {
      return computeIfAbsentInMap(similarColors, colorToNumber(mean), () => {
        const [similarColor] = colorMixer.findSimilarColors(mean, 1);
        return similarColor?.colorMixture.layerRgb || Rgb.WHITE.toRgbTuple();
      });
    });
    const preview: ImageBitmap = await createImageBitmap(imageData);
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('limited-palette');
    }
    return transfer({preview}, [preview]);
  }
}

function colorToNumber([r, g, b]: RgbTuple) {
  return (r << 16) + (g << 8) + b;
}
