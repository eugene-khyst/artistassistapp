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
  ColorType,
  deltaEOKr2,
  makeColorMixtures,
  Reflectance,
  rgbToOklab,
  type RgbTuple,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {assert, describe, expect, it} from 'vitest';

import {
  getMixtureMatchScore,
  MixtureAdjustmentKind,
  recommendMixtureAdjustment,
} from '@/services/color/compare-mixture';

function paint(id: number, rgb: RgbTuple): Color {
  return {brand: 1, id, name: String(id), rgb, rho: [...Reflectance.fromRgb(...rgb).toArray()]};
}
const blue = paint(1, [40, 60, 160]);
const yellow = paint(2, [245, 205, 35]);
const recipe = makeColorMixtures({
  type: ColorType.Gouache,
  colors: [blue, yellow],
  ratios: [[1, 1]],
})[0][0];

describe('recommendMixtureAdjustment', () => {
  it('reports a full match for the target and a lower percentage for a different mix', () => {
    expect(getMixtureMatchScore(recipe, recipe.tintRgb)).toBe(100);
    const score = getMixtureMatchScore(recipe, blue.rgb);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThan(100);
    expect(getMixtureMatchScore({...recipe, tintRgb: [255, 255, 255]}, [0, 0, 0])).toBeCloseTo(
      0,
      5
    );
  });

  it('recognizes the target and recommends no addition', () => {
    expect(recommendMixtureAdjustment(recipe, recipe.tintRgb)).toEqual({
      kind: MixtureAdjustmentKind.WithinTargetTolerance,
    });
  });

  it('compares the full-strength tint for wash recipes and colored underlayers', () => {
    const layers = makeColorMixtures({
      type: ColorType.WatercolorPaint,
      colors: [blue, yellow],
      ratios: [[1, 1]],
      consistencies: [[1, 4]],
      underlayerRgb: [200, 150, 100],
    })[0];
    const wash = layers[1]!;
    expect(wash.layerRgb).not.toEqual(wash.tintRgb);
    expect(getMixtureMatchScore(wash, wash.tintRgb)).toBe(100);
    expect(getMixtureMatchScore(wash, wash.layerRgb)).toBeLessThan(100);
    expect(recommendMixtureAdjustment(wash, wash.tintRgb)).toEqual({
      kind: MixtureAdjustmentKind.WithinTargetTolerance,
    });
    expect(recommendMixtureAdjustment(wash, blue.rgb)).toEqual(
      recommendMixtureAdjustment(layers[0], blue.rgb)
    );
  });

  it('accepts a non-exact match when no tested addition improves it', () => {
    const mixture = {
      ...recipe,
      parts: [blue, paint(4, blue.rgb)].map(color => ({color, part: 1})),
      tintRgb: [45, 65, 165] as RgbTuple,
    };
    expect(getMixtureMatchScore(mixture, blue.rgb)).toBeLessThan(100);
    expect(recommendMixtureAdjustment(mixture, blue.rgb)).toEqual({
      kind: MixtureAdjustmentKind.WithinTargetTolerance,
    });
  });

  it('suggests an improvement even inside the recipe-search acceptance gate', () => {
    const sample = Reflectance.mixKM(
      [Reflectance.fromArray(blue.rho), Reflectance.fromArray(yellow.rho)],
      [[2, 1]]
    )[0]!.toRgbTuple();
    expect(deltaEOKr2(...rgbToOklab(...sample), ...rgbToOklab(...recipe.tintRgb))).toBeLessThan(
      0.125
    );
    const adjustment = recommendMixtureAdjustment(recipe, sample);
    assert(adjustment.kind === MixtureAdjustmentKind.AddPaint);
    expect(adjustment.colors).toEqual([yellow]);
  });

  it.each([
    [1.1, {kind: MixtureAdjustmentKind.WithinTargetTolerance}],
    [1.15, {kind: MixtureAdjustmentKind.AddPaint, colors: [yellow]}],
  ])('ignores an improvement within photo noise (blue part %s)', (bluePart, expected) => {
    const sample = Reflectance.mixKM(
      [Reflectance.fromArray(blue.rho), Reflectance.fromArray(yellow.rho)],
      [[bluePart, 1]]
    )[0]!.toRgbTuple();
    expect(recommendMixtureAdjustment(recipe, sample)).toEqual(expected);
  });

  it('suggests yellow for a blue sample and blue for a yellow sample', () => {
    expect(recommendMixtureAdjustment(recipe, blue.rgb)).toEqual({
      kind: MixtureAdjustmentKind.AddPaint,
      colors: [yellow],
    });
    expect(recommendMixtureAdjustment(recipe, yellow.rgb)).toEqual({
      kind: MixtureAdjustmentKind.AddPaint,
      colors: [blue],
    });
  });

  it('reports a close match when every 1/8 addition overshoots the target', () => {
    const sample = Reflectance.mixKM(
      [Reflectance.fromArray(blue.rho), Reflectance.fromArray(yellow.rho)],
      [[1.05, 1]]
    )[0]!.toRgbTuple();
    const current = Reflectance.fromRgb(...sample);
    const target = rgbToOklab(...recipe.tintRgb);
    const before = deltaEOKr2(...rgbToOklab(...sample), ...target);
    const initialTrial = Reflectance.mixKM(
      [current, Reflectance.fromArray(yellow.rho)],
      [[1, 1 / 8]]
    )[0]!.toRgbTuple();
    expect(deltaEOKr2(...rgbToOklab(...initialTrial), ...target)).toBeGreaterThan(before);
    expect(recommendMixtureAdjustment(recipe, sample)).toEqual({
      kind: MixtureAdjustmentKind.WithinTargetTolerance,
    });
  });

  const red = paint(3, [190, 40, 45]);
  it.each([
    ['blue', [blue]],
    ['yellow', [yellow]],
    ['red', [red]],
    ['blue and yellow', [blue, yellow]],
    ['blue and red', [blue, red]],
    ['yellow and red', [yellow, red]],
  ] as const)('can suggest %s from a three-paint recipe', (_name, additions) => {
    const sampledRgb: RgbTuple = [255, 255, 255];
    const target = Reflectance.mixKM(
      [
        Reflectance.fromRgb(...sampledRgb),
        ...additions.map(color => Reflectance.fromArray(color.rho)),
      ],
      [[1, ...additions.map(() => 1 / 8)]]
    )[0]!.toRgbTuple();
    const mixture = {
      ...recipe,
      parts: [blue, yellow, red].map(color => ({color, part: 1})),
      tintRgb: target,
    };
    expect(recommendMixtureAdjustment(mixture, sampledRgb)).toEqual({
      kind: MixtureAdjustmentKind.AddPaint,
      colors: additions,
    });
  });

  it('considers the recipe white as an available addition', () => {
    const white = paint(3, [250, 250, 250]);
    const mixture = {...recipe, white, tintRgb: [230, 230, 230] as RgbTuple};
    const adjustment = recommendMixtureAdjustment(mixture, [80, 80, 80]);
    assert(adjustment.kind === MixtureAdjustmentKind.AddPaint);
    expect(adjustment.colors).toContainEqual(white);
  });

  it.each([
    ['white for too much paint', [3, 1], 'white'],
    ['paint for too much white', [1, 3], 'paint'],
  ] as const)('suggests %s in a one-paint tint', (_name, [paintPart, whitePart], expected) => {
    const white = paint(3, [250, 250, 250]);
    const tint = (parts: number[]) =>
      Reflectance.mixKM(
        [Reflectance.fromArray(blue.rho), Reflectance.fromArray(white.rho)],
        [parts]
      )[0]!.toRgbTuple();
    const mixture = {...recipe, parts: [{color: blue, part: 1}], white, tintRgb: tint([1, 1])};
    expect(recommendMixtureAdjustment(mixture, tint([paintPart, whitePart]))).toEqual({
      kind: MixtureAdjustmentKind.AddPaint,
      colors: [expected === 'white' ? white : blue],
    });
  });

  it('excludes adding all three paints together', () => {
    const sampledRgb: RgbTuple = [255, 255, 255];
    const colors = [blue, yellow, red];
    const target = Reflectance.mixKM(
      [
        Reflectance.fromRgb(...sampledRgb),
        ...colors.map(color => Reflectance.fromArray(color.rho)),
      ],
      [[1, 1 / 8, 1 / 8, 1 / 8]]
    )[0]!.toRgbTuple();
    const mixture = {
      ...recipe,
      parts: colors.map(color => ({color, part: 1})),
      tintRgb: target,
    };
    const adjustment = recommendMixtureAdjustment(mixture, sampledRgb);
    assert(adjustment.kind === MixtureAdjustmentKind.AddPaint);
    expect(adjustment.colors.length).toBeLessThan(3);
  });

  it('does not invent an ingredient when every addition makes the sample worse', () => {
    const mixture = {
      ...recipe,
      parts: [blue, paint(4, blue.rgb)].map(color => ({color, part: 1})),
      tintRgb: yellow.rgb,
    };
    expect(recommendMixtureAdjustment(mixture, blue.rgb)).toEqual({
      kind: MixtureAdjustmentKind.NoImprovingAddition,
    });
  });
});
