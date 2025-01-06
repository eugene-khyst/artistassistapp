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

import {kuwaharaFilterWebGL} from '~/src/services/image/filter/kuwahara-filter-webgl';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

export class Blur {
  async getBlurred(blob: Blob): Promise<ImageBitmap[]> {
    console.time('blur');
    const image: ImageBitmap = await createScaledImageBitmap(blob, IMAGE_SIZE.HD);
    let blurred: ImageBitmap[] = kuwaharaFilterWebGL(image, [2, 3, 4]);
    blurred = [image, ...blurred];
    console.timeEnd('blur');
    return blurred;
  }
}
