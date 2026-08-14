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
  type ColorBrandDefinition,
  type ColorDefinition,
  ColorType,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it} from 'vitest';

import {toColorSet} from '@/services/color/colors';

const BRAND: ColorBrandDefinition = {
  id: 1,
  alias: 'test-brand',
  fullName: 'Test Brand',
  freeTier: true,
};

const zincWhite: ColorDefinition = {
  id: 10,
  name: 'Zinc White',
  hex: 'FFFFFF',
  rho: new Array<number>(36).fill(0.9),
  isWhite: true,
};

const ultramarine: ColorDefinition = {
  id: 11,
  name: 'Ultramarine',
  hex: '1033BE',
  rho: new Array<number>(36).fill(0.2),
};

describe('toColorSet', () => {
  /**
   * The data pipeline marks whites by name, and the color mixer needs the flag to pull the white
   * out of the pigment list and mix tints with it. Dropping it here left gouache with no tints and
   * zinc white mixed as if it were a pigment.
   */
  it('carries isWhite through to the color set', () => {
    const colorSet = toColorSet(
      {id: 1, type: ColorType.Gouache, brands: [1], colors: {1: [10, 11]}},
      new Map([[1, BRAND]]),
      new Map([
        [
          'test-brand',
          new Map([
            [10, zincWhite],
            [11, ultramarine],
          ]),
        ],
      ]),
      null
    );

    expect(colorSet?.colors).toHaveLength(2);
    expect(colorSet?.colors.find(({id}) => id === 10)?.isWhite).toBe(true);
    expect(colorSet?.colors.find(({id}) => id === 11)?.isWhite).toBeUndefined();
  });
});
