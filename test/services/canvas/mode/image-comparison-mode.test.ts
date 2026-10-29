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

import {Rectangle, Vector} from '@eugene-khyst/artistassistapp-image-processing/math/geometry';
import {describe, expect, it, vi} from 'vitest';

import type {CanvasModeContext, CanvasPointer} from '@/services/canvas/mode/canvas-mode';
import {ImageComparisonMode} from '@/services/canvas/mode/image-comparison-mode';

function pointer(x: number, y: number): CanvasPointer {
  const point = new Vector(x, y);
  return {canvasPoint: point, worldPoint: point, imageCenteredPoint: point, imagePoint: point};
}
function box(x: number, y: number): Rectangle {
  return Rectangle.fromTopLeft(new Vector(x, y), 32, 32);
}
function setup() {
  const onChange = vi.fn();
  const context: CanvasModeContext = {
    getCanvas: () => ({}) as HTMLCanvasElement,
    getImages: () => [{width: 1000, height: 500} as ImageBitmap],
    getImageIndex: () => 0,
    getImageDimension: () => new Rectangle(new Vector(1000, 500)),
    getSourceImageDimension: () => new Rectangle(new Vector(1000, 500)),
    getZoom: () => 1,
    isExporting: () => false,
    zoomToFit: vi.fn(),
    requestRedraw: vi.fn(),
    refreshCursor: vi.fn(),
  };
  const mode = new ImageComparisonMode({onChange});
  mode.activate(context);
  mode.onImagesLoaded();
  return {mode, context, onChange};
}

describe('ImageComparisonMode', () => {
  it('places undetected squares on opposite sides of the photo center', () => {
    const {mode, onChange} = setup();
    expect(mode.getRegions()).toEqual([box(468, 234), box(500, 234)]);
    expect(onChange).toHaveBeenLastCalledWith(mode.getRegions());
  });

  it.each([0, 1] as const)('keeps detected square %s and centers the missing square', index => {
    const {context} = setup();
    const detected = box(100, 100);
    const mode = new ImageComparisonMode({
      onChange: vi.fn(),
      getInitialRegions: () => (index === 0 ? [detected, null] : [null, detected]),
    });
    mode.activate(context);
    mode.onImagesLoaded();
    expect(mode.getRegions()).toEqual(
      index === 0 ? [detected, box(500, 234)] : [box(468, 234), detected]
    );
  });

  it('moves a square from anywhere inside it, including its edge, without resizing', () => {
    const {mode} = setup();
    const drag = mode.startDrag(pointer(468, 250))!;
    drag.move(pointer(134, 250));
    drag.end();
    expect(mode.getRegions()).toEqual([box(134, 234), box(500, 234)]);
  });
  it('cancels a move and preserves selections across activation until the next photo', () => {
    const {mode, context} = setup();
    const drag = mode.startDrag(pointer(480, 250))!;
    drag.move(pointer(-200, -200));
    drag.end();
    const canceled = mode.startDrag(pointer(1, 1))!;
    canceled.move(pointer(101, 101));
    canceled.cancel();
    mode.deactivate();
    mode.activate(context);
    expect(mode.getRegions()[0]).toEqual(box(0, 0));
    mode.onImagesLoaded();
    expect(mode.getRegions()).toEqual([box(468, 234), box(500, 234)]);
    context.getImages = () => [];
    mode.onImagesLoaded();
    expect(mode.getRegions()).toEqual([null, null]);
  });
  it('loads automatic selections when an image is loaded', () => {
    const {context} = setup();
    const image = {width: 1000, height: 500} as ImageBitmap;
    const regions = [box(100, 100), box(400, 100)] as const;
    const getInitialRegions = vi.fn(() => regions);
    const mode = new ImageComparisonMode({onChange: vi.fn(), getInitialRegions});
    context.getImages = () => [image];
    mode.activate(context);
    mode.onImagesLoaded();
    expect(getInitialRegions).toHaveBeenCalledWith(image);
    expect(mode.getRegions()).toEqual(regions);
  });
  it('moves a detected square when zoomed out without needing a handle', () => {
    const {context} = setup();
    context.getZoom = () => 0.2;
    context.getImages = () => [{width: 1000, height: 500} as ImageBitmap];
    const mode = new ImageComparisonMode({
      onChange: vi.fn(),
      getInitialRegions: () => [box(100, 100), box(400, 100)],
    });
    mode.activate(context);
    mode.onImagesLoaded();
    const drag = mode.startDrag(pointer(410, 110))!;
    drag.move(pointer(510, 210));
    drag.end();
    expect(mode.getRegions()[1]).toEqual(box(500, 200));
  });
  it('grabs a square within a touch radius that grows as the photo zooms out', () => {
    const {context, mode} = setup();
    expect(mode.startDrag(pointer(440, 250))).toBeUndefined();
    context.getZoom = () => 0.5;
    const drag = mode.startDrag(pointer(440, 250))!;
    drag.move(pointer(340, 250));
    drag.end();
    expect(mode.getRegions()).toEqual([box(368, 234), box(500, 234)]);
  });
  it('grabs the square with the nearest center when both are within reach', () => {
    const {mode} = setup();
    const drag = mode.startDrag(pointer(502, 250))!;
    drag.move(pointer(602, 250));
    drag.end();
    expect(mode.getRegions()).toEqual([box(468, 234), box(600, 234)]);
  });
});
