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

import {
  type Color,
  type ColorMixture,
  deltaEOKr2,
  deltaEOKr2ToMatchScore,
  getMaxMatchDeltaEOKr2,
  Reflectance,
  rgbToOklab,
  type RgbTuple,
} from '@eugene-khyst/artistassistapp-color-mixer';

export enum MixtureAdjustmentKind {
  WithinTargetTolerance,
  AddPaint,
  NoImprovingAddition,
}

export type MixtureAdjustment =
  | {kind: MixtureAdjustmentKind.WithinTargetTolerance}
  | {kind: MixtureAdjustmentKind.AddPaint; colors: AdditionColors}
  | {kind: MixtureAdjustmentKind.NoImprovingAddition};

type AdditionColors = readonly [Color, ...Color[]];

// Less than 1/8 of the mix is not a practical addition.
const ADDITION_AMOUNT = 1 / 8;
// Photo noise alone can make an addition look this much better.
const MIN_ADDITION_DELTA_E_OKR2_IMPROVEMENT = 0.01;

function getAdditionCombinations(colors: readonly Color[]): AdditionColors[] {
  const combinations: AdditionColors[] = [];
  for (const color of colors) {
    const extended = combinations.map<AdditionColors>(combination => [...combination, color]);
    combinations.push([color], ...extended);
  }
  return combinations.filter(combination => combination.length < colors.length);
}

export function getMixtureMatchScore({tintRgb}: ColorMixture, sampledRgb: RgbTuple): number {
  return deltaEOKr2ToMatchScore(
    deltaEOKr2(...rgbToOklab(...sampledRgb), ...rgbToOklab(...tintRgb))
  );
}

export function recommendMixtureAdjustment(
  {parts, white, tintRgb}: ColorMixture,
  sampledRgb: RgbTuple
): MixtureAdjustment {
  const target = rgbToOklab(...tintRgb);
  const sampleDistance = deltaEOKr2(...rgbToOklab(...sampledRgb), ...target);
  const sampleReflectance = Reflectance.fromRgb(...sampledRgb);
  const colors = [...parts.map(({color}) => color), ...(white ? [white] : [])];
  const reflectances = new Map(colors.map(color => [color, Reflectance.fromArray(color.rho)]));
  let bestDistance = sampleDistance - MIN_ADDITION_DELTA_E_OKR2_IMPROVEMENT;
  let bestColors: AdditionColors | null = null;
  for (const additions of getAdditionCombinations(colors)) {
    const [trial] = Reflectance.mixKM(
      [sampleReflectance, ...additions.map(color => reflectances.get(color)!)],
      [[1, ...additions.map(() => ADDITION_AMOUNT)]]
    );
    const distance = deltaEOKr2(...rgbToOklab(...trial!.toRgbTuple()), ...target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestColors = additions;
    }
  }
  if (bestColors) {
    return {kind: MixtureAdjustmentKind.AddPaint, colors: bestColors};
  }
  return {
    kind:
      sampleDistance <= getMaxMatchDeltaEOKr2(target)
        ? MixtureAdjustmentKind.WithinTargetTolerance
        : MixtureAdjustmentKind.NoImprovingAddition,
  };
}
