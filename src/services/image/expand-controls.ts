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
import type {ImageDimension} from '@/utils/graphics';

export enum ExpandMode {
  AspectRatio = 'aspect-ratio',
  Margins = 'margins',
}

export enum ExpandMarginUnit {
  Percent = 'percent',
  Pixel = 'pixel',
}

export enum ExpandFillMode {
  Color = 'color',
  Smart = 'smart',
}

export interface ExpandControls {
  sizeMode: ExpandMode;
  aspectRatio: Fraction;
  marginUnit: ExpandMarginUnit;
  marginX: number;
  marginY: number;
  fillMode: ExpandFillMode;
  color: string;
}

export const DEFAULT_EXPAND_CONTROLS: ExpandControls = {
  sizeMode: ExpandMode.AspectRatio,
  aspectRatio: [1, 1],
  marginUnit: ExpandMarginUnit.Percent,
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

export function fullImageMargin(marginUnit: ExpandMarginUnit, size: number): number {
  return marginUnit === ExpandMarginUnit.Pixel ? Math.max(1, size) : 100;
}

export function clampExpandMargins(
  controls: ExpandControls,
  {width, height}: ImageDimension
): ExpandControls {
  return {
    ...controls,
    marginX: Math.min(controls.marginX, fullImageMargin(controls.marginUnit, width)),
    marginY: Math.min(controls.marginY, fullImageMargin(controls.marginUnit, height)),
  };
}

export function convertExpandMargins(
  {marginUnit, marginX, marginY}: ExpandControls,
  targetUnit: ExpandMarginUnit,
  {width, height}: ImageDimension
): Pick<ExpandControls, 'marginUnit' | 'marginX' | 'marginY'> {
  if (marginUnit === targetUnit) {
    return {marginUnit, marginX, marginY};
  }
  const roundingFactor = targetUnit === ExpandMarginUnit.Pixel ? 1 : 100;
  const convert = (margin: number, size: number): number =>
    Math.round(
      (roundingFactor * margin * fullImageMargin(targetUnit, size)) /
        fullImageMargin(marginUnit, size)
    ) / roundingFactor;
  return {
    marginUnit: targetUnit,
    marginX: convert(marginX, width),
    marginY: convert(marginY, height),
  };
}
