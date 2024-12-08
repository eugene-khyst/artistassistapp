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

import {kuwaharaFilterWebGL} from '~/src/services/image/filter/kuwahara-filter-webgl';
import {medianFilterBulk} from '~/src/services/image/filter/median-filter';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

interface Result {
  blurred: ImageBitmap[];
}

export class Blur {
  async getBlurred(blob: Blob): Promise<Result> {
    console.time('blur');
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.HD);
    let blurred: ImageBitmap[];
    try {
      blurred = kuwaharaFilterWebGL(image, [2, 3, 4]);
    } catch (e) {
      console.error(e);
      blurred = medianFilterBulk(image, [1, 2, 3]);
    }
    blurred = [image, ...blurred];
    console.timeEnd('blur');
    return transfer({blurred}, blurred);
  }
}
