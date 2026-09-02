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

import type {Fraction} from '@eugene-khyst/artistassistapp-color-mixer';

export enum ExpandImageSizeMode {
  AspectRatio = 'aspect-ratio',
  Margins = 'margins',
}

export enum ExpandImageFillMode {
  Color = 'color',
  Smart = 'smart',
}

export interface ExpandImageControls {
  sizeMode: ExpandImageSizeMode;
  aspectRatio: Fraction;
  marginX: number;
  marginY: number;
  fillMode: ExpandImageFillMode;
  color: string;
}

export const DEFAULT_EXPAND_IMAGE_CONTROLS: ExpandImageControls = {
  sizeMode: ExpandImageSizeMode.AspectRatio,
  aspectRatio: [1, 1],
  marginX: 10,
  marginY: 10,
  fillMode: ExpandImageFillMode.Color,
  color: '#fff',
};
