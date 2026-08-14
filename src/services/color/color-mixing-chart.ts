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
  type ColorMixture,
  type ColorSet,
  makeColorMixtures,
  makeSingleColorMixture,
} from '@eugene-khyst/artistassistapp-color-mixer';

export class ColorMixingChart {
  makeColorMixingChart(colorSet: ColorSet | null): ColorMixture[][] {
    if (!colorSet) {
      return [];
    }
    const {type, colors} = colorSet;
    const {length} = colors;
    const colorMixtures: ColorMixture[][] = Array.from(
      {length},
      () => new Array<ColorMixture>(length)
    );
    for (let i = 0; i < length; i++) {
      colorMixtures[i]![i] = makeSingleColorMixture(type, colors[i]!);
    }
    for (let i = 0; i < length - 1; i++) {
      for (let j = i + 1; j < length; j++) {
        const [[thick, thinned]] = makeColorMixtures({
          type,
          colors: [colors[i]!, colors[j]!],
          ratios: [[1, 1]],
          consistencies: [[1, 2]],
        });
        colorMixtures[i]![j] = thick;
        colorMixtures[j]![i] = thinned ?? thick;
      }
    }
    return colorMixtures;
  }
}
