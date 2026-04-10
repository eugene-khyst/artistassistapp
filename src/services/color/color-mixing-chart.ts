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
  makeColorMixture,
  makeSingleColorMixture,
  PAPER_WHITE,
} from '~/src/services/color/color-mixer';
import type {ColorMixture, ColorSet} from '~/src/services/color/types';

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
        const [thick, thinned] = makeColorMixture(
          type,
          [colors[i]!, colors[j]!],
          [1, 1],
          PAPER_WHITE,
          [[1, 2]]
        );
        colorMixtures[i]![j] = thick!;
        colorMixtures[j]![i] = thinned ?? thick!;
      }
    }
    return colorMixtures;
  }
}
