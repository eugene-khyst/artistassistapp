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

import type {AppSettings} from '@/services/settings/types';
import {toEnumValue} from '@/utils/enum';

export enum SharpenMode {
  UnsharpMask = 'unsharp-mask',
  HighPass = 'high-pass',
}

export const SHARPEN_MODES = [
  SharpenMode.UnsharpMask,
  SharpenMode.HighPass,
] as const satisfies SharpenMode[];

export interface SharpenControls {
  mode: SharpenMode;
  strength: number;
}

export const SHARPEN_STRENGTH_MIN = 1;
export const SHARPEN_STRENGTH_MAX = 5;

const DEFAULT_SHARPEN_CONTROLS: Readonly<SharpenControls> = {
  mode: SharpenMode.UnsharpMask,
  strength: 1,
};

export function defaultSharpenControls(): SharpenControls {
  return {...DEFAULT_SHARPEN_CONTROLS};
}

export function sharpenControlsFromAppSettings(
  appSettings: AppSettings
): Pick<SharpenControls, 'mode'> {
  return {
    mode: toEnumValue(SharpenMode, appSettings.sharpenMode) ?? DEFAULT_SHARPEN_CONTROLS.mode,
  };
}

export function sharpenControlsToAppSettings(
  controls: Partial<SharpenControls>
): Partial<AppSettings> {
  return controls.mode === undefined ? {} : {sharpenMode: controls.mode};
}
