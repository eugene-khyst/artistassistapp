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

import {type Grid, type GridCanvas, GridType} from '~/src/services/canvas/image/grid-canvas';
import type {GridSettings} from '~/src/services/settings/types';
import {GridMode} from '~/src/services/settings/types';

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  enabled: true,
  mode: GridMode.Square,
  size: 4,
  diagonals: false,
};

export function setGrid(
  gridCanvas: GridCanvas,
  {enabled, mode, size, diagonals}: GridSettings
): void {
  let grid: Grid | null = null;
  if (enabled) {
    switch (mode) {
      case GridMode.Rectangular_2x2:
        grid = {type: GridType.Rectangular, size: [2, 2], diagonals};
        break;
      case GridMode.Rectangular_3x3:
        grid = {type: GridType.Rectangular, size: [3, 3], diagonals};
        break;
      case GridMode.Rectangular_4x4:
        grid = {type: GridType.Rectangular, size: [4, 4], diagonals};
        break;
      case GridMode.Square:
      default:
        grid = {type: GridType.Square, size};
        break;
    }
  }
  gridCanvas.setGrid(grid);
}
