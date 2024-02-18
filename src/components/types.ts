/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ReactNode} from 'react';

export enum TabKey {
  Paints = 'paints',
  Photo = 'photo',
  Colors = 'colors',
  Sketch = 'sketch',
  TonalValues = 'tonal-values',
  Palette = 'palette',
  Grid = 'grid',
  ColorMixing = 'color-mixing',
  PrimaryColors = 'primary-colors',
  Help = 'help',
}

export interface CascaderOption {
  value?: string | number;
  label: ReactNode;
  children?: CascaderOption[];
  disabled?: boolean;
}
