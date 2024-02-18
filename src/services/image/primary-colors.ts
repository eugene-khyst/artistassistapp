/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {transfer} from 'comlink';
import {
  IMAGE_SIZE,
  computeIfAbsentInMap,
  createScaledImageBitmap,
  imageBitmapToOffscreenCanvas,
} from '../../utils';
import {ColorMixer, OFF_WHITE_HEX, PaintSet} from '../color';
import {RgbTuple} from '../color/model';
import {medianCutQuantization} from './median-cut';

interface Result {
  preview?: ImageBitmap;
}

export class PrimaryColors {
  async getPreview(blob: Blob, paintSet: PaintSet): Promise<Result> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('primary-colors');
    }
    const colorMixer = new ColorMixer();
    await colorMixer.setBackground(OFF_WHITE_HEX);
    await colorMixer.setPaintSet(paintSet);
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.SD);
    const [canvas, ctx] = imageBitmapToOffscreenCanvas(image);
    const imageData: ImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    image.close();
    const similarColors = new Map<number, RgbTuple>();
    medianCutQuantization(imageData, 11, (mean: RgbTuple): RgbTuple => {
      return computeIfAbsentInMap(similarColors, colorToNumber(mean), () => {
        const [similarColor] = colorMixer.findSimilarColors(mean, false, 1, 0, true, 0);
        return similarColor?.paintMix.paintMixLayerRgb || [255, 255, 255];
      });
    });
    const preview: ImageBitmap = await createImageBitmap(imageData);
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('primary-colors');
    }
    return transfer({preview}, [preview]);
  }
}

function colorToNumber([r, g, b]: RgbTuple) {
  return (r << 16) + (g << 8) + b;
}
