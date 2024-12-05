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

import {linearizeRgbChannel, unlinearizeRgbChannel} from '~/src/services/color/space';

export function saturate({data}: ImageData, saturation = 1): void {
  if (saturation === 1) {
    return;
  }
  for (let i = 0; i < data.length; i += 4) {
    const r = linearizeRgbChannel(data[i]!);
    const g = linearizeRgbChannel(data[i + 1]!);
    const b = linearizeRgbChannel(data[i + 2]!);
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const correctedR = r + (luminance - r) * (1 - saturation);
    const correctedG = g + (luminance - g) * (1 - saturation);
    const correctedB = b + (luminance - b) * (1 - saturation);
    data[i] = unlinearizeRgbChannel(correctedR);
    data[i + 1] = unlinearizeRgbChannel(correctedG);
    data[i + 2] = unlinearizeRgbChannel(correctedB);
  }
}
