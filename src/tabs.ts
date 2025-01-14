/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
  ColorCorrection = 'color-correction',
  ColorPicker = 'color-picker',
  Palette = 'palette',
  TonalValues = 'tonal-values',
  SimplifiedPhoto = 'simplified',
  Outline = 'outline',
  Grid = 'grid',
  ColorMixing = 'color-mixing',
  LimitedPalette = 'limited-palette',
  StyleTransfer = 'style-transfer',
  BackgroundRemove = 'background-remove',
  Compare = 'compare',
  Install = 'install',
  CustomColorBrand = 'custom-brand',
  Help = 'help',
}

export const TAB_LABELS: Record<TabKey, string> = {
  [TabKey.ColorSet]: 'Color set',
  [TabKey.Photo]: 'Photo',
  [TabKey.ColorPicker]: 'Color picker',
  [TabKey.Palette]: 'Palette',
  [TabKey.TonalValues]: 'Tonal values',
  [TabKey.SimplifiedPhoto]: 'Simplified',
  [TabKey.Outline]: 'Outline',
  [TabKey.Grid]: 'Grid',
  [TabKey.ColorMixing]: 'Color mixing',
  [TabKey.LimitedPalette]: 'Limited palette',
  [TabKey.StyleTransfer]: 'Inspire',
  [TabKey.ColorCorrection]: 'White balance',
  [TabKey.BackgroundRemove]: 'Remove background',
  [TabKey.Compare]: 'Compare',
  [TabKey.Install]: 'Install',
  [TabKey.CustomColorBrand]: 'Custom brand',
  [TabKey.Help]: 'Help',
};
