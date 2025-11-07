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

import type {ImageFile} from '~/src/services/image/image-file';
import type {TabKey} from '~/src/tabs';

export enum ColorPickerSort {
  BySimilarity = 1,
  ByNumberOfColors = 2,
  ByConsistency = 3,
}

export enum GridMode {
  Square = 1,
  Rectangular_4x4 = 3,
  Rectangular_3x3 = 2,
  Rectangular_2x2 = 4,
}

export enum OutlineMode {
  Quick = 0,
  Quality = 1,
}

export interface GridSettings {
  enabled: boolean;
  mode: GridMode;
  size: number;
  diagonals: boolean;
}

export interface AppSettings {
  activeTabKey?: TabKey;
  colorPickerDiameter?: number;
  colorPickerSort?: ColorPickerSort;
  grids?: Partial<Record<TabKey, Partial<GridSettings>>>;
  outlineMode?: OutlineMode;
  backgroundRemovalModel?: string;
  styleTransferModel?: string;
  styleTransferImage?: ImageFile;
  autoSavingColorSetsJson?: boolean;
  latestColorSetsJsonHash?: string;
}
