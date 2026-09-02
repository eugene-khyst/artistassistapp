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

export const ORIGINAL_CROP_ASPECT_RATIO = 'original';

export type CropAspectRatio = Fraction | typeof ORIGINAL_CROP_ASPECT_RATIO | null;

const IMAGE_ASPECT_RATIOS: readonly Fraction[] = [
  [1, 1],
  [4, 5],
  [5, 4],
  [3, 4],
  [4, 3],
  [2, 3],
  [3, 2],
  [9, 16],
  [16, 9],
  [1.91, 1],
];

export function imageAspectRatioLabel(aspectRatio: Fraction): string {
  return aspectRatio.join(':');
}

const IMAGE_ASPECT_RATIOS_BY_LABEL = new Map<string, Fraction>(
  IMAGE_ASPECT_RATIOS.map(aspectRatio => [imageAspectRatioLabel(aspectRatio), aspectRatio])
);

export function imageAspectRatio(label: string): Fraction | undefined {
  return IMAGE_ASPECT_RATIOS_BY_LABEL.get(label);
}

export const IMAGE_ASPECT_RATIO_OPTIONS = [...IMAGE_ASPECT_RATIOS_BY_LABEL.keys()].map(label => ({
  value: label,
  label,
}));
