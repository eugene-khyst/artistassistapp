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

import {sobelEdgeDetection} from '~/src/services/image/filter/sobel-operator';
import {sobelEdgeDetectionWebGL} from '~/src/services/image/filter/sobel-operator-webgl';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

interface Result {
  outline: ImageBitmap;
}

export class Outline {
  async getOutline(blob: Blob): Promise<Result> {
    console.time('outline');
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE['2K']);
    let outline: ImageBitmap;
    try {
      outline = sobelEdgeDetectionWebGL(image);
    } catch (e) {
      console.error(e);
      outline = sobelEdgeDetection(image);
    }
    image.close();
    console.timeEnd('outline');
    return transfer({outline}, [outline]);
  }
}
