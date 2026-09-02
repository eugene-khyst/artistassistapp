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

import {describe, expect, it, vi} from 'vitest';

import type {CanvasModeContext, CanvasPointer} from '@/services/canvas/mode/canvas-mode';
import {
  ImageCroppingMode,
  ORIGINAL_CROP_ASPECT_RATIO,
} from '@/services/canvas/mode/image-cropping-mode';
import {Rectangle, Vector} from '@/services/math/geometry';

vi.mock('@/services/image/filter/invert-colors-webgl', () => ({
  invertColorsWebGL: vi.fn(),
}));

function pointer(x: number, y: number): CanvasPointer {
  const point = new Vector(x, y);
  return {
    canvasPoint: point,
    worldPoint: point,
    imageCenteredPoint: point,
    imagePoint: point,
  };
}

function createMode(width = 200, height = 100): ImageCroppingMode {
  const context: CanvasModeContext = {
    getCanvas: () => ({}) as HTMLCanvasElement,
    getImages: () => [],
    getImageIndex: () => 0,
    getImageDimension: () => new Rectangle(new Vector(width, height)),
    getSourceImageDimension: () => new Rectangle(new Vector(width, height)),
    getZoom: () => 1,
    isExporting: () => false,
    zoomToFit: vi.fn(),
    requestRedraw: vi.fn(),
    refreshCursor: vi.fn(),
  };
  const mode = new ImageCroppingMode({hitBoxSize: 10});
  mode.activate(context);
  mode.onImagesLoaded();
  return mode;
}

describe('ImageCroppingMode', () => {
  it('uses only the center handle to move the crop rectangle', () => {
    const mode = createMode();
    mode.setAspectRatio([1, 1]);

    expect(mode.startDrag(pointer(75, 25))).toBeUndefined();

    const drag = mode.startDrag(pointer(100, 50));
    drag?.move(pointer(200, 100));
    drag?.end();

    expect(mode.getCropRectangle()).toEqual(Rectangle.fromTopLeft(new Vector(100, 0), 100, 100));
  });

  it('resizes freely without allowing an edge to cross its opposite edge', () => {
    const mode = createMode();

    const drag = mode.startDrag(pointer(0, 50));
    drag?.move(pointer(250, 50));
    drag?.end();

    const rectangle = mode.getCropRectangle();
    expect(rectangle.topLeft.x).toBe(190);
    expect(rectangle.bottomRight.x).toBe(200);
  });

  it('maintains a Fraction aspect ratio while dragging a corner', () => {
    const mode = createMode(200, 200);
    mode.setAspectRatio([4, 5]);
    const initial = mode.getCropRectangle();

    const drag = mode.startDrag(pointer(initial.bottomRight.x, initial.bottomRight.y));
    drag?.move(pointer(150, 150));
    drag?.end();

    const rectangle = mode.getCropRectangle();
    expect(rectangle.width / rectangle.height).toBeCloseTo(4 / 5);
    expect(rectangle.topLeft).toEqual(initial.topLeft);
  });

  it('maintains a Fraction aspect ratio while dragging an edge', () => {
    const mode = createMode(300, 200);
    mode.setAspectRatio([16, 9]);
    const initial = mode.getCropRectangle();

    const drag = mode.startDrag(pointer(initial.bottomRight.x, initial.center.y));
    drag?.move(pointer(240, initial.center.y));
    drag?.end();

    const rectangle = mode.getCropRectangle();
    expect(rectangle.width / rectangle.height).toBeCloseTo(16 / 9);
    expect(rectangle.topLeft.x).toBe(initial.topLeft.x);
    expect(rectangle.center.y).toBeCloseTo(initial.center.y);
  });

  it('derives the Original aspect ratio from the image dimensions', () => {
    const mode = createMode(300, 200);
    mode.setAspectRatio([1, 1]);
    mode.setAspectRatio(ORIGINAL_CROP_ASPECT_RATIO);

    const rectangle = mode.getCropRectangle();
    expect(rectangle.width / rectangle.height).toBeCloseTo(3 / 2);
  });
});
