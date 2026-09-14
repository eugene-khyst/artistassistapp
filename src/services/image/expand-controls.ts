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

import {imageAspectRatio, imageAspectRatioLabel} from '@/services/image/aspect-ratio';
import type {AppSettings} from '@/services/settings/types';
import {toEnumValue} from '@/utils/enum';

export enum ExpandMode {
  AspectRatio = 'aspect-ratio',
  Margins = 'margins',
}

export enum ExpandFillMode {
  Color = 'color',
  Smart = 'smart',
}

export interface ExpandControls {
  sizeMode: ExpandMode;
  aspectRatio: Fraction;
  marginX: number;
  marginY: number;
  fillMode: ExpandFillMode;
  color: string;
}

export const DEFAULT_EXPAND_CONTROLS: ExpandControls = {
  sizeMode: ExpandMode.AspectRatio,
  aspectRatio: [1, 1],
  marginX: 10,
  marginY: 10,
  fillMode: ExpandFillMode.Color,
  color: '#fff',
};

export function expandControlsFromAppSettings(
  appSettings: AppSettings
): Pick<ExpandControls, 'sizeMode' | 'aspectRatio' | 'fillMode'> {
  return {
    sizeMode:
      toEnumValue(ExpandMode, appSettings.expandSizeMode) ?? DEFAULT_EXPAND_CONTROLS.sizeMode,
    aspectRatio:
      imageAspectRatio(appSettings.expandAspectRatio ?? '') ?? DEFAULT_EXPAND_CONTROLS.aspectRatio,
    fillMode:
      toEnumValue(ExpandFillMode, appSettings.expandFillMode) ?? DEFAULT_EXPAND_CONTROLS.fillMode,
  };
}

export function expandControlsToAppSettings(
  controls: Partial<ExpandControls>
): Partial<AppSettings> {
  const appSettings: Partial<AppSettings> = {};
  if (controls.sizeMode !== undefined) {
    appSettings.expandSizeMode = controls.sizeMode;
  }
  if (controls.aspectRatio !== undefined) {
    appSettings.expandAspectRatio = imageAspectRatioLabel(controls.aspectRatio);
  }
  if (controls.fillMode !== undefined) {
    appSettings.expandFillMode = controls.fillMode;
  }
  return appSettings;
}
