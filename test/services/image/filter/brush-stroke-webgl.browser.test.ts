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

import {describe, expect, it} from 'vitest';

import {renderBrushStrokesWebGL} from '@/services/image/filter/brush-stroke-webgl';
import type {Float32Tensor} from '@/services/ml/tensor';

import {createImage, pixelAt, readImage} from './fixtures';

const GEOMETRY = {patchSize: 64, overlap: 32, strokeScale: 0.75};

function blendedPixels({data}: ImageData): number {
  return Array.from({length: data.length / 4}, (_, i) => i).filter(
    i => data[4 * i]! >= 32 && data[4 * i + 2]! >= 32
  ).length;
}

function strokes(...entries: {index: number; values: number[]}[]): Float32Tensor {
  const data = new Float32Array(800);
  entries.forEach(({index, values}) => {
    data.set(values, index * 8);
  });
  return {data, dims: [1, 100, 8]};
}

function brush(value: number): OffscreenCanvas {
  return createImage(32, 32, (x, y) =>
    x > 0 && y > 0 && x < 31 && y < 31 ? [value, value, value, 255] : [0, 0, 0, 0]
  );
}

function brushes(vertical = 255, horizontal = vertical) {
  return {vertical: brush(vertical), horizontal: brush(horizontal)};
}

describe('brush stroke rendering', () => {
  it('places a stroke using image coordinates and keeps uncovered pixels black', () => {
    const output = readImage(
      renderBrushStrokesWebGL(
        [strokes({index: 0, values: [0.25, 0.25, 0.2, 0.2, 0, 1, 0.2, 0.1]})],
        brushes(),
        {width: 64, height: 64},
        GEOMETRY
      )
    );
    expect([output.width, output.height]).toEqual([128, 128]);
    expect(pixelAt(output, 16, 16)).toEqual([255, 51, 26, 255]);
    expect(pixelAt(output, 16, 112)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(output, 112, 16)).toEqual([0, 0, 0, 255]);
  });

  it('preserves the rectangular shape and rotates a stroke by half a turn unit', () => {
    const render = (angle: number) =>
      readImage(
        renderBrushStrokesWebGL(
          [strokes({index: 0, values: [0.5, 0.5, 0.5, 0.1, angle, 1, 1, 1]})],
          brushes(),
          {width: 64, height: 64},
          GEOMETRY
        )
      );
    const horizontal = render(0);
    const vertical = render(0.5);
    expect(pixelAt(horizontal, 96, 64)).toEqual([255, 255, 255, 255]);
    expect(pixelAt(horizontal, 64, 96)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(vertical, 96, 64)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(vertical, 64, 96)).toEqual([255, 255, 255, 255]);
  });

  it('uses brush intensity as paint shading with an opaque stroke mask', () => {
    const result = readImage(
      renderBrushStrokesWebGL(
        [
          strokes(
            {index: 0, values: [0.5, 0.5, 1, 1, 0, 1, 1, 1]},
            {index: 1, values: [0.5, 0.5, 1, 1, 0, 1, 0, 0]}
          ),
        ],
        brushes(128),
        {width: 64, height: 64},
        GEOMETRY
      )
    );
    expect(pixelAt(result, 64, 64)).toEqual([128, 0, 0, 255]);
  });

  it('chooses the vertical brush for tall strokes and horizontal for wide ones', () => {
    const render = (width: number, height: number) =>
      readImage(
        renderBrushStrokesWebGL(
          [strokes({index: 0, values: [0.5, 0.5, width, height, 0, 1, 1, 1]})],
          brushes(64, 192),
          {width: 64, height: 64},
          GEOMETRY
        )
      );
    expect(pixelAt(render(0.2, 0.8), 64, 64)).toEqual([64, 64, 64, 255]);
    expect(pixelAt(render(0.8, 0.2), 64, 64)).toEqual([192, 192, 192, 255]);
  });

  it('merges groups across patches before later strokes, including stroke 100', () => {
    const result = readImage(
      renderBrushStrokesWebGL(
        [
          strokes({index: 99, values: [0.5, 0.5, 1, 1, 0, 1, 0.2, 0.1]}),
          strokes({index: 0, values: [0.5, 0.5, 1, 1, 0, 0.1, 0.2, 1]}),
        ],
        brushes(),
        {width: 128, height: 64},
        GEOMETRY
      )
    );
    expect(pixelAt(result, 128, 64)).toEqual([255, 51, 26, 255]);
    expect(pixelAt(result, 192, 64)).toEqual([26, 51, 255, 255]);
  });

  it('crops the padded last patch to the scaled image dimensions', () => {
    const result = renderBrushStrokesWebGL(
      [strokes(), strokes()],
      brushes(),
      {width: 65, height: 33},
      GEOMETRY
    );
    expect([result.width, result.height]).toEqual([130, 66]);
  });

  it('blends the colors on both sides of a stroke edge', () => {
    expect(blendedPixels(readImage(overlappingStrokes()))).toBeGreaterThan(0);
  });

  function overlappingStrokes(): OffscreenCanvas {
    return renderBrushStrokesWebGL(
      [
        strokes(
          {index: 0, values: [0.5, 0.5, 1, 1, 0, 1, 0, 0]},
          {index: 1, values: [0.5, 0.5, 0.4, 0.4, 0.1, 0, 0, 1]}
        ),
      ],
      brushes(),
      {width: 64, height: 64},
      GEOMETRY
    );
  }

  it('paints a stroke thinner than a pixel only where it covers', () => {
    const output = readImage(
      renderBrushStrokesWebGL(
        [strokes({index: 0, values: [0.5, 0.5, 0.8, 0.01, 0, 1, 1, 1]})],
        brushes(),
        {width: 64, height: 64},
        GEOMETRY
      )
    );
    expect(pixelAt(output, 64, 64)[0]).toBeGreaterThan(0);
    expect(pixelAt(output, 64, 20)).toEqual([0, 0, 0, 255]);
    expect(pixelAt(output, 4, 4)).toEqual([0, 0, 0, 255]);
  });

  it('rejects model output with an unexpected shape', () => {
    const invalid = {data: new Float32Array(792), dims: [1, 99, 8]};
    expect(() =>
      renderBrushStrokesWebGL([invalid], brushes(), {width: 64, height: 64}, GEOMETRY)
    ).toThrow('got [1, 99, 8]');
  });
});
