/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TabKey {
  ColorSet = 'color-set',
  Photo = 'photo',
  ColorPicker = 'color-picker',
  Palette = 'palette',
  TonalValues = 'tonal-values',
  SimplifiedPhoto = 'simplified',
  Outline = 'outline',
  Grid = 'grid',
  ColorMixing = 'color-mixing',
  LimitedPalette = 'limited-palette',
  Compare = 'compare',
  Install = 'install',
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
  [TabKey.Compare]: 'Compare',
  [TabKey.Install]: 'Install',
  [TabKey.Help]: 'Help',
};
