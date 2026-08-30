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

export enum TabKey {
  ColorSet = 'color-set',
  Photo = 'photo',
  ColorPicker = 'color-picker',
  Palette = 'palette',
  ColorMixing = 'color-mixing',
  ColorMixingChart = 'color-mixing-chart',
  TwoColorGradient = '2-color-gradient',
  Outline = 'outline',
  Grid = 'grid',
  TonalValues = 'tonal-values',
  Simplify = 'simplify',
  LimitedPalette = 'limited-palette',
  StyleTransfer = 'style-transfer',
  EditImage = 'edit-image',
  CompareImages = 'compare-images',
  CustomColors = 'custom-colors',
  Help = 'help',
}

export const DEFAULT_TAB_KEY = TabKey.ColorSet;

const TAB_KEYS = new Set<string>(Object.values(TabKey));

export function isTabKey(value: unknown): value is TabKey {
  return typeof value === 'string' && TAB_KEYS.has(value);
}
