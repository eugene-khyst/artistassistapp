/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {thresholdFilter} from '~/src/services/image/filter/threshold';
import {thresholdFilterWebGL} from '~/src/services/image/filter/threshold-webgl';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

interface Result {
  tones: ImageBitmap[];
}

export class TonalValues {
  async getTones(
    blob: Blob,
    thresholds: [number, number, number] = [0.825, 0.6, 0.35]
  ): Promise<Result> {
    console.time('tones');
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.HD);
    thresholds.sort((a: number, b: number) => b - a);
    let tones: ImageBitmap[];
    try {
      tones = thresholdFilterWebGL(image, thresholds);
    } catch (e) {
      console.error(e);
      tones = thresholdFilter(image, thresholds);
    }
    image.close();
    console.timeEnd('tones');
    return transfer({tones}, tones);
  }
}
