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

import {hexToRgb, linearizeRgbChannel, WHITE_HEX} from '@eugene-khyst/artistassistapp-color-mixer';

import type {AdjustmentParameters} from '@/services/image/adjust-colors';

export enum AdjustColorsWhiteBalanceMethod {
  None = 0,
  Percentile = 1,
  WhitePoint = 2,
}

export interface AdjustColorsControls {
  whiteBalanceMethod: AdjustColorsWhiteBalanceMethod;
  percentile: number;
  whitePoint: string;
  saturation: number;
  inputLevels: number[];
  gammaPercent: number;
  outputLevels: number[];
  originalTemperature: number;
  targetTemperature: number;
}

const DEFAULT_ADJUST_COLORS_CONTROLS: Readonly<AdjustColorsControls> = {
  whiteBalanceMethod: AdjustColorsWhiteBalanceMethod.Percentile,
  percentile: 98,
  whitePoint: WHITE_HEX,
  saturation: 100,
  inputLevels: [0, 255],
  gammaPercent: 50,
  outputLevels: [0, 255],
  originalTemperature: 6500,
  targetTemperature: 6500,
};

export function copyAdjustColorsControls(controls: AdjustColorsControls): AdjustColorsControls {
  return {
    ...controls,
    inputLevels: [...controls.inputLevels],
    outputLevels: [...controls.outputLevels],
  };
}

export function defaultAdjustColorsControls(): AdjustColorsControls {
  return copyAdjustColorsControls(DEFAULT_ADJUST_COLORS_CONTROLS);
}

export function gammaToPercent(gamma: number): number {
  return 50 * (Math.log(gamma) / Math.log(2) + 1);
}

export function percentToGamma(percent: number): number {
  return Math.exp((percent / 50 - 1) * Math.log(2));
}

export function adjustmentParameters({
  saturation,
  inputLevels: [inputLow, inputHigh],
  gammaPercent,
  outputLevels: [outputLow, outputHigh],
  originalTemperature,
  targetTemperature,
}: AdjustColorsControls): AdjustmentParameters {
  return {
    saturation: saturation / 100,
    inputLow: inputLow! / 255,
    inputHigh: inputHigh! / 255,
    gamma: percentToGamma(gammaPercent),
    outputLow: outputLow! / 255,
    outputHigh: outputHigh! / 255,
    origTemperature: originalTemperature,
    targetTemperature,
  };
}

export function whiteBalanceMaxValues(
  {whiteBalanceMethod, whitePoint}: AdjustColorsControls,
  percentileMaxValues?: number[]
): number[] | undefined {
  switch (whiteBalanceMethod) {
    case AdjustColorsWhiteBalanceMethod.Percentile:
      return percentileMaxValues;
    case AdjustColorsWhiteBalanceMethod.WhitePoint:
      return hexToRgb(whitePoint).map(value => linearizeRgbChannel(value));
    case AdjustColorsWhiteBalanceMethod.None:
      return undefined;
  }
}
