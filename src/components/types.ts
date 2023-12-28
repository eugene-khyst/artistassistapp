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
  TonalValues = 'tonalValues',
  Palette = 'palette',
  Grid = 'grid',
}

export interface CascaderOption {
  value?: string | number;
  label: ReactNode;
  children?: CascaderOption[];
}
