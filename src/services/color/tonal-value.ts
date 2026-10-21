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

import {rgbToOklab, type RgbTuple} from '@eugene-khyst/artistassistapp-color-mixer';

export enum TonalValue {
  Shadows = 0,
  Midtones = 1,
  LightTones = 2,
  Highlights = 3,
}

export const TONAL_VALUES = [
  TonalValue.Shadows,
  TonalValue.Midtones,
  TonalValue.LightTones,
  TonalValue.Highlights,
];

export const TONAL_VALUE_THRESHOLDS = [0.825, 0.6, 0.35];

export function getTonalValue(lightness: number): TonalValue {
  if (lightness >= TONAL_VALUE_THRESHOLDS[0]!) {
    return TonalValue.Highlights;
  }
  if (lightness >= TONAL_VALUE_THRESHOLDS[1]!) {
    return TonalValue.LightTones;
  }
  if (lightness >= TONAL_VALUE_THRESHOLDS[2]!) {
    return TonalValue.Midtones;
  }
  return TonalValue.Shadows;
}

export function getRgbTonalValue(rgb: RgbTuple): TonalValue {
  const [l] = rgbToOklab(...rgb);
  return getTonalValue(l);
}

export function matchesTonalValue(rgb: RgbTuple, tonalValue: TonalValue | null): boolean {
  return tonalValue === null || getRgbTonalValue(rgb) === tonalValue;
}
