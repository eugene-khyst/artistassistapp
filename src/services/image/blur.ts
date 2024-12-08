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

import {medianFilterBulk} from '~/src/services/image/filter/median-filter';
import {medianFilterWebGL} from '~/src/services/image/filter/median-filter-webgl';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

interface Result {
  blurred: ImageBitmap[];
}

export class Blur {
  async getBlurred(blob: Blob, medianFilterRadiuses: number[] = [1, 2, 3]): Promise<Result> {
    console.time('blur');
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.HD);
    let blurred: ImageBitmap[];
    try {
      blurred = medianFilterWebGL(image, medianFilterRadiuses);
    } catch (e) {
      console.error(e);
      blurred = medianFilterBulk(image, medianFilterRadiuses);
    }
    blurred = [image, ...blurred];
    console.timeEnd('blur');
    return transfer({blurred}, blurred);
  }
}
