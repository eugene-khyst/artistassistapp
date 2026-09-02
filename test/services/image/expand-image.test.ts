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
import {afterEach, describe, expect, it, vi} from 'vitest';

import {createExpansionMask, getImageExpansion} from '@/services/image/expand-image';
import {
  DEFAULT_EXPAND_IMAGE_CONTROLS,
  type ExpandImageControls,
  ExpandImageSizeMode,
} from '@/services/image/expand-image-controls';
import {Rectangle, Vector} from '@/services/math/geometry';

function mockOffscreenCanvas(): ReturnType<typeof vi.fn> {
  const fillRect = vi.fn();
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        readonly width: number,
        readonly height: number
      ) {}
      getContext() {
        return {drawImage: vi.fn(), fillRect};
      }
    }
  );
  return fillRect;
}

const ASPECT_RATIOS: Fraction[] = [
  [16, 9],
  [9, 16],
  [4, 5],
  [5, 4],
  [1, 1],
  [3, 1],
];

const marginsControls = {
  ...DEFAULT_EXPAND_IMAGE_CONTROLS,
  sizeMode: ExpandImageSizeMode.Margins,
  marginX: 10,
  marginY: 20,
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('image expansion', () => {
  it('expands only the required axis to an aspect ratio', () => {
    const expansion = getImageExpansion(
      {width: 100, height: 100},
      {...DEFAULT_EXPAND_IMAGE_CONTROLS, aspectRatio: [1.91, 1]}
    );

    expect(expansion.bounds).toEqual(new Rectangle(new Vector(191, 100)));
    expect(expansion.sourceRectangle).toEqual(Rectangle.fromTopLeft(new Vector(45, 0), 100, 100));
    expect(expansion.margins).toEqual([
      Rectangle.fromTopLeft(Vector.ZERO, 45, 100),
      Rectangle.fromTopLeft(new Vector(145, 0), 46, 100),
    ]);
  });

  it('does not expand again to correct a one-pixel aspect-ratio rounding difference', () => {
    const controls: ExpandImageControls = {
      ...DEFAULT_EXPAND_IMAGE_CONTROLS,
      aspectRatio: [16, 9],
    };
    const firstExpansion = getImageExpansion({width: 100, height: 100}, controls);
    const repeatedExpansion = getImageExpansion(firstExpansion.bounds, controls);

    expect(firstExpansion.bounds).toEqual(new Rectangle(new Vector(178, 100)));
    expect(repeatedExpansion.bounds).toEqual(firstExpansion.bounds);
    expect(repeatedExpansion.margins).toEqual([]);
  });

  it('keeps the aspect ratio when the pixel cap scales the expansion down', () => {
    const controls: ExpandImageControls = {...DEFAULT_EXPAND_IMAGE_CONTROLS, aspectRatio: [4, 5]};
    const firstExpansion = getImageExpansion({width: 3581, height: 500}, controls);
    const repeatedExpansion = getImageExpansion(firstExpansion.bounds, controls);

    expect(firstExpansion.bounds).toEqual(new Rectangle(new Vector(3577, 4472)));
    expect(repeatedExpansion.bounds).toEqual(firstExpansion.bounds);
    expect(repeatedExpansion.margins).toEqual([]);
  });

  it.each([
    {width: 1, height: 8019},
    {width: 8019, height: 1},
  ])('keeps a nonzero source rectangle for a $width x $height image', ({width, height}) => {
    const {sourceRectangle} = getImageExpansion(
      {width, height},
      {...DEFAULT_EXPAND_IMAGE_CONTROLS, aspectRatio: [1, 1]}
    );

    expect(sourceRectangle.width).toBeGreaterThan(0);
    expect(sourceRectangle.height).toBeGreaterThan(0);
  });

  it('settles after one expansion at every size, including past the pixel cap', () => {
    let cappedCount = 0;
    for (const aspectRatio of ASPECT_RATIOS) {
      const controls: ExpandImageControls = {...DEFAULT_EXPAND_IMAGE_CONTROLS, aspectRatio};
      for (let width = 500; width <= 4000; width += 61) {
        for (let height = 500; height <= 4000; height += 67) {
          const {bounds, sourceRectangle} = getImageExpansion({width, height}, controls);
          if (sourceRectangle.width !== width) {
            cappedCount++;
          }
          const repeated = getImageExpansion(bounds, controls);
          expect([repeated.bounds.width, repeated.bounds.height, repeated.margins.length]).toEqual([
            bounds.width,
            bounds.height,
            0,
          ]);
        }
      }
    }
    expect(cappedCount).toBeGreaterThan(0);
  });

  it('adds each percentage to both corresponding sides', () => {
    const expansion = getImageExpansion(
      {width: 200, height: 100},
      {
        ...DEFAULT_EXPAND_IMAGE_CONTROLS,
        sizeMode: ExpandImageSizeMode.Margins,
        marginX: 10,
        marginY: 20,
      }
    );

    expect(expansion.bounds).toEqual(new Rectangle(new Vector(240, 140)));
    expect(expansion.sourceRectangle).toEqual(Rectangle.fromTopLeft(new Vector(20, 20), 200, 100));
  });

  it('scales the whole layout down to the supported output size', () => {
    const expansion = getImageExpansion(
      {width: 4000, height: 4000},
      {
        ...DEFAULT_EXPAND_IMAGE_CONTROLS,
        sizeMode: ExpandImageSizeMode.Margins,
        marginX: 100,
        marginY: 100,
      }
    );

    expect(expansion.bounds).toEqual(new Rectangle(new Vector(3999, 3999)));
    expect(expansion.sourceRectangle).toEqual(
      Rectangle.fromTopLeft(new Vector(1333, 1333), 1333, 1333)
    );
    expect(expansion.margins.map(({width, height}) => [width, height])).toEqual([
      [3999, 1333],
      [3999, 1333],
      [1333, 1333],
      [1333, 1333],
    ]);
  });

  it('centers the image exactly at every size, including past the pixel cap', () => {
    let cappedCount = 0;
    for (const margin of [5, 10, 25, 50, 100]) {
      const controls: ExpandImageControls = {
        ...marginsControls,
        marginX: margin,
        marginY: margin,
      };
      for (let width = 500; width <= 4000; width += 113) {
        for (let height = 500; height <= 4000; height += 127) {
          const {bounds, sourceRectangle} = getImageExpansion({width, height}, controls);
          if (sourceRectangle.width !== width) {
            cappedCount++;
          }
          expect(sourceRectangle.center).toEqual(bounds.center);
        }
      }
    }
    expect(cappedCount).toBeGreaterThan(0);
  });
});

describe('expansion mask', () => {
  it('marks exactly the margins', () => {
    const fillRect = mockOffscreenCanvas();
    const expansion = getImageExpansion({width: 200, height: 100}, marginsControls);

    createExpansionMask(expansion);

    expect(fillRect.mock.calls).toEqual([
      [0, 0, 240, 140],
      [0, 0, 240, 20],
      [0, 120, 240, 20],
      [0, 20, 20, 100],
      [220, 20, 20, 100],
    ]);
  });
});
