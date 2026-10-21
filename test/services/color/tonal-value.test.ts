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

import {getRgbTonalValue, getTonalValue, TonalValue} from '@/services/color/tonal-value';

describe('tonal values', () => {
  it.each([
    [0, TonalValue.Shadows],
    [0.35 - Number.EPSILON, TonalValue.Shadows],
    [0.35, TonalValue.Midtones],
    [0.6 - Number.EPSILON, TonalValue.Midtones],
    [0.6, TonalValue.LightTones],
    [0.825 - Number.EPSILON, TonalValue.LightTones],
    [0.825, TonalValue.Highlights],
    [1, TonalValue.Highlights],
  ])('classifies lightness %s as tonal value %s', (lightness, expected) => {
    expect(getTonalValue(lightness)).toBe(expected);
  });

  it('classifies a saturated blue by lightness', () => {
    expect(getRgbTonalValue([0, 0, 255])).toBe(TonalValue.Midtones);
    expect(getRgbTonalValue([0, 0, 0])).toBe(TonalValue.Shadows);
    expect(getRgbTonalValue([255, 255, 255])).toBe(TonalValue.Highlights);
  });
});
