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

import {describe, expect, it} from 'vitest';

import {
  convertExpandMargins,
  DEFAULT_EXPAND_CONTROLS,
  ExpandMarginUnit,
} from '@/services/image/expand-controls';

const image = {width: 400, height: 300};

describe('expand margin conversion', () => {
  it('converts percentages to the pixels they expand by', () => {
    expect(
      convertExpandMargins(
        {...DEFAULT_EXPAND_CONTROLS, marginX: 10, marginY: 25},
        ExpandMarginUnit.Pixel,
        image
      )
    ).toEqual({marginUnit: ExpandMarginUnit.Pixel, marginX: 40, marginY: 75});
  });

  it('converts pixels to percentages with two decimals', () => {
    expect(
      convertExpandMargins(
        {...DEFAULT_EXPAND_CONTROLS, marginUnit: ExpandMarginUnit.Pixel, marginX: 42, marginY: 100},
        ExpandMarginUnit.Percent,
        image
      )
    ).toEqual({marginUnit: ExpandMarginUnit.Percent, marginX: 10.5, marginY: 33.33});
  });

  it('keeps a small pixel margin through a round trip', () => {
    const percent = convertExpandMargins(
      {...DEFAULT_EXPAND_CONTROLS, marginUnit: ExpandMarginUnit.Pixel, marginX: 3, marginY: 1},
      ExpandMarginUnit.Percent,
      image
    );

    expect(
      convertExpandMargins({...DEFAULT_EXPAND_CONTROLS, ...percent}, ExpandMarginUnit.Pixel, image)
    ).toEqual({marginUnit: ExpandMarginUnit.Pixel, marginX: 3, marginY: 1});
  });

  it('keeps margins already in the target unit', () => {
    expect(
      convertExpandMargins(
        {...DEFAULT_EXPAND_CONTROLS, marginX: 12.5, marginY: 7},
        ExpandMarginUnit.Percent,
        image
      )
    ).toEqual({marginUnit: ExpandMarginUnit.Percent, marginX: 12.5, marginY: 7});
  });
});
