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

import {deltaEOKr2, rgbToOklab, type RgbTuple} from '@eugene-khyst/artistassistapp-color-mixer';
import {describe, expect, it} from 'vitest';

import {getRgbTonalValue, TONAL_VALUES, TonalValue} from '@/services/color/tonal-value';
import {
  computeSamplingPoints,
  type SamplingPoint,
  selectSamplingPoints,
} from '@/services/image/sampling-point';

function imageFromRows(rows: string[]): ImageData {
  return {
    width: rows[0]!.length,
    height: rows.length,
    data: new Uint8ClampedArray(
      rows.flatMap(row =>
        Array.from({length: row.length}, (_, x) =>
          row[x] === '#' ? [255, 0, 0, 255] : [0, 0, 0, 255]
        ).flat()
      )
    ),
  } as ImageData;
}

function paletteError(points: SamplingPoint[], palette: SamplingPoint[]): number {
  return points.reduce((error, {rgb, pixelCount}) => {
    const oklab = rgbToOklab(...rgb);
    const distance = Math.min(
      ...palette.map(point => deltaEOKr2(...oklab, ...rgbToOklab(...point.rgb)))
    );
    return error + pixelCount * distance ** 2;
  }, 0);
}

describe('computeSamplingPoints', () => {
  it('centers a marker on a plateau of equally deep pixels', () => {
    const image = imageFromRows(Array.from({length: 7}, () => '###############'));

    expect(computeSamplingPoints(image)).toEqual([{rgb: [255, 0, 0], x: 7, y: 3, pixelCount: 105}]);
  });

  it('centers a marker in a one-pixel-wide region', () => {
    expect(computeSamplingPoints(imageFromRows(['#########']))).toEqual([
      {rgb: [255, 0, 0], x: 4, y: 0, pixelCount: 9},
    ]);
  });

  it('keeps the marker inside its color when the centroid is outside', () => {
    const image = imageFromRows(['#####', '#...#', '#...#', '#...#', '#####']);
    const points = computeSamplingPoints(image);
    const red = points.find(({rgb}) => rgb[0] === 255)!;

    expect(points).toHaveLength(2);
    expect(red.pixelCount).toBe(16);
    expect(points.find(({rgb}) => rgb[0] === 0)!.pixelCount).toBe(9);
    expect(image.data[(red.y * image.width + red.x) * 4]).toBe(255);
    expect(red.x === 0 || red.x === 4 || red.y === 0 || red.y === 4).toBe(true);
  });

  it('prefers a thick interior over an isolated occurrence of the same color', () => {
    const image = imageFromRows([
      '#........',
      '.........',
      '...#####.',
      '...#####.',
      '...#####.',
      '...#####.',
      '...#####.',
      '.........',
    ]);

    expect(computeSamplingPoints(image)).toContainEqual({
      rgb: [255, 0, 0],
      x: 5,
      y: 4,
      pixelCount: 26,
    });
  });
});

describe('selectSamplingPoints', () => {
  const points: SamplingPoint[] = Array.from({length: 60}, (_, i) => ({
    x: i,
    y: 0,
    rgb: [i * 4, i * 4, i * 4] satisfies RgbTuple,
    pixelCount: 1,
  }));

  it.each([12, 24, 36, 48])(
    'reserves two distinct mixtures per populated tonal value (%i)',
    maxColors => {
      const candidates: SamplingPoint[] = [
        ...Array.from({length: 60}, (_, i) => ({
          rgb: [60 + i, 60 + i, 60 + i] as RgbTuple,
          x: i,
          y: 0,
          pixelCount: 100_000,
        })),
        ...[0, 30, 140, 180, 225, 255].map(gray => ({
          rgb: [gray, gray, gray] as RgbTuple,
          x: gray,
          y: 1,
          pixelCount: 1,
        })),
      ];

      const result = selectSamplingPoints(candidates, maxColors);

      expect(result).toHaveLength(maxColors);
      for (const value of TONAL_VALUES) {
        expect(
          result.filter(({rgb}) => getRgbTonalValue(rgb) === value).length
        ).toBeGreaterThanOrEqual(2);
      }
    }
  );

  it('counts coverage using matched paints when they cross a tonal boundary', () => {
    const candidates = [
      ...Array.from({length: 60}, (_, i) => ({
        rgb: [60 + i, 60 + i, 60 + i] as RgbTuple,
        paint: [60 + i, 60 + i, 60 + i] as RgbTuple,
        x: i,
        y: 0,
        pixelCount: 100_000,
      })),
      ...[175, 180, 245, 255].map((gray, i) => ({
        rgb: [225 + i * 10, 225 + i * 10, 225 + i * 10] as RgbTuple,
        paint: [gray, gray, gray] as RgbTuple,
        x: i,
        y: 1,
        pixelCount: 1,
      })),
    ];

    const result = selectSamplingPoints(candidates, 12, point => point.paint);

    expect(
      result.filter(({paint}) => getRgbTonalValue(paint) === TonalValue.Highlights)
    ).toHaveLength(2);
    expect(
      result.filter(({paint}) => getRgbTonalValue(paint) === TonalValue.LightTones)
    ).toHaveLength(2);
  });

  it.each([4, 5, 6, 7])('reduces the per-band minimum to fit a budget of %i', maxColors => {
    const candidates: SamplingPoint[] = [
      ...Array.from({length: 30}, (_, i) => ({
        rgb: [60 + i, 60 + i, 60 + i] as RgbTuple,
        x: i,
        y: 0,
        pixelCount: 100_000,
      })),
      ...[0, 30, 140, 180, 225, 255].map(gray => ({
        rgb: [gray, gray, gray] as RgbTuple,
        x: gray,
        y: 1,
        pixelCount: 1,
      })),
    ];

    const result = selectSamplingPoints(candidates, maxColors);

    expect(result).toHaveLength(maxColors);
    expect(new Set(result.map(({rgb}) => getRgbTonalValue(rgb)))).toEqual(new Set(TONAL_VALUES));
  });

  it.each([1, 2, 3])('covers distinct bands when only %i mixtures fit', maxColors => {
    const candidates: SamplingPoint[] = [
      ...Array.from({length: 30}, (_, i) => ({
        rgb: [60 + i, 60 + i, 60 + i] as RgbTuple,
        x: i,
        y: 0,
        pixelCount: 100_000,
      })),
      ...[0, 30, 140, 180, 225, 255].map(gray => ({
        rgb: [gray, gray, gray] as RgbTuple,
        x: gray,
        y: 1,
        pixelCount: 1,
      })),
    ];

    const result = selectSamplingPoints(candidates, maxColors);

    expect(result).toHaveLength(maxColors);
    expect(new Set(result.map(({rgb}) => getRgbTonalValue(rgb))).size).toBe(maxColors);
  });

  it('returns only shadows and highlights for black-and-white samples', () => {
    const candidates: SamplingPoint[] = [0, 255, 0, 255].map((gray, x) => ({
      rgb: [gray, gray, gray],
      x,
      y: 0,
      pixelCount: 1,
    }));

    expect(selectSamplingPoints(candidates, 48).map(({rgb}) => rgb)).toEqual([
      [0, 0, 0],
      [255, 255, 255],
    ]);
  });

  it.each([24, 36, 48])('fills a budget of %i even for similar colors', maxColors => {
    const result = selectSamplingPoints(points, maxColors);

    expect(result).toHaveLength(maxColors);
    expect(new Set(result.map(({rgb}) => rgb.join(','))).size).toBe(maxColors);
    for (const point of result) {
      expect(points).toContain(point);
    }
    expect(selectSamplingPoints(points, maxColors)).toEqual(result);
  });

  it('returns fewer colors when paint matches are identical', () => {
    const result = selectSamplingPoints([points[0]!, {...points[0]!, x: 5}, points[59]!], 24);

    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([points[0], points[59]]));
  });

  it('handles no paint matches', () => {
    expect(selectSamplingPoints([], 24)).toEqual([]);
  });

  it.each([
    {name: 'sepia', dominant: [174, 151, 122], accent: [155, 102, 35]},
    {name: 'ochre-beige', dominant: [207, 193, 163], accent: [192, 144, 39]},
  ] satisfies {name: string; dominant: RgbTuple; accent: RgbTuple}[])(
    'keeps the dominant tone in a $name image',
    ({dominant, accent}) => {
      const accentPoint = {rgb: accent, x: 0, y: 0, pixelCount: 1};
      const dominantPoint = {rgb: dominant, x: 1, y: 0, pixelCount: 999};

      expect(selectSamplingPoints([accentPoint, dominantPoint], 1)).toEqual([dominantPoint]);
    }
  );

  it('reserves a slot for a one-pixel tonal band even when it excludes a common shade', () => {
    const dominant: SamplingPoint = {rgb: [200, 180, 150], x: 0, y: 0, pixelCount: 800};
    const shade: SamplingPoint = {rgb: [160, 140, 110], x: 1, y: 0, pixelCount: 200};
    const outlier: SamplingPoint = {rgb: [120, 0, 200], x: 2, y: 0, pixelCount: 1};

    expect(selectSamplingPoints([outlier, dominant, shade], 2)).toEqual([outlier, dominant]);
  });

  it('combines coverage for identical paint matches and keeps the larger source region', () => {
    const small: SamplingPoint = {rgb: [207, 193, 163], x: 0, y: 0, pixelCount: 20};
    const large: SamplingPoint = {...small, x: 1, pixelCount: 40};
    const other: SamplingPoint = {rgb: [155, 102, 35], x: 2, y: 0, pixelCount: 50};

    expect(selectSamplingPoints([small, other, large], 1)).toEqual([large]);
    expect([small.pixelCount, large.pixelCount, other.pixelCount]).toEqual([20, 40, 50]);
  });

  it('chooses the best single color across all sepia tones, even when it is less frequent', () => {
    const dark: SamplingPoint = {rgb: [80, 60, 40], x: 0, y: 0, pixelCount: 400};
    const middle: SamplingPoint = {rgb: [140, 120, 90], x: 1, y: 0, pixelCount: 350};
    const light: SamplingPoint = {rgb: [200, 180, 150], x: 2, y: 0, pixelCount: 250};
    const candidates = [dark, middle, light];

    const result = selectSamplingPoints(candidates, 1);

    expect(result).toEqual([middle]);
    for (const point of candidates) {
      expect(paletteError(candidates, result)).toBeLessThanOrEqual(
        paletteError(candidates, [point])
      );
    }
  });

  it('chooses the next color by its total error reduction across all groups', () => {
    const candidates: SamplingPoint[] = [
      {rgb: [100, 100, 100], x: 0, y: 0, pixelCount: 1000},
      {rgb: [145, 145, 145], x: 1, y: 0, pixelCount: 100},
      {rgb: [160, 160, 160], x: 2, y: 0, pixelCount: 100},
      {rgb: [175, 175, 175], x: 3, y: 0, pixelCount: 100},
      {rgb: [0, 0, 0], x: 4, y: 0, pixelCount: 50},
    ];

    const result = selectSamplingPoints(candidates, 2);

    expect(result[0]).toBe(candidates[0]);
    expect(result[1]).toBe(candidates[2]);
    for (const point of candidates) {
      expect(paletteError(candidates, result)).toBeLessThanOrEqual(
        paletteError(candidates, [result[0]!, point])
      );
    }
  });

  it('minimizes error against original samples when paint matches differ from them', () => {
    const candidates = [
      {
        rgb: [149, 149, 149] as RgbTuple,
        paint: [100, 100, 100] as RgbTuple,
        x: 0,
        y: 0,
        pixelCount: 900,
      },
      {
        rgb: [160, 160, 160] as RgbTuple,
        paint: [160, 160, 160] as RgbTuple,
        x: 1,
        y: 0,
        pixelCount: 100,
      },
    ];

    expect(selectSamplingPoints(candidates, 1, point => point.paint)).toEqual([candidates[1]]);
    expect(selectSamplingPoints(candidates, 2, point => point.paint)).toHaveLength(2);
  });
});
