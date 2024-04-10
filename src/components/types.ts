/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ReactNode} from 'react';

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
  Help = 'help',
}

export interface CascaderOption {
  value?: string | number;
  label: ReactNode;
  children?: CascaderOption[];
  disabled?: boolean;
}
