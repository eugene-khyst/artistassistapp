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

import {type CanvasModeContext, DARKENED_AREA_COLOR} from '@/services/canvas/mode/canvas-mode';
import {ImageExpandingMode} from '@/services/canvas/mode/image-expanding-mode';
import {
  DEFAULT_EXPAND_IMAGE_CONTROLS,
  ExpandImageFillMode,
  ExpandImageSizeMode,
} from '@/services/image/expand-image-controls';
import {Rectangle, Vector} from '@/services/math/geometry';

function createModeEnvironment(dimension: Rectangle): CanvasModeContext {
  return {
    getCanvas: () => ({}) as HTMLCanvasElement,
    getImages: () => [],
    getImageIndex: () => 0,
    getImageDimension: () => dimension,
    getSourceImageDimension: () => dimension,
    getZoom: () => 1,
    isExporting: () => false,
    zoomToFit: vi.fn(),
    requestRedraw: vi.fn(),
    refreshCursor: vi.fn(),
  };
}

describe('ImageExpandingMode', () => {
  it('enlarges the virtual image bounds and centers the source image', () => {
    const dimension = new Rectangle(new Vector(200, 100));
    const modeEnvironment = createModeEnvironment(dimension);
    const mode = new ImageExpandingMode();
    mode.activate(modeEnvironment);
    mode.setControls({
      ...DEFAULT_EXPAND_IMAGE_CONTROLS,
      sizeMode: ExpandImageSizeMode.Margins,
      marginX: 10,
      marginY: 20,
    });

    expect(mode.getImageDimension(dimension)).toEqual(new Rectangle(new Vector(240, 140)));
    expect(mode.getSourceImageRectangle(dimension)).toEqual(
      Rectangle.fromTopLeft(new Vector(20, 20), 200, 100)
    );
    expect(modeEnvironment.zoomToFit).toHaveBeenCalledOnce();
  });

  it('refits only when the controls change the output size', () => {
    const modeEnvironment = createModeEnvironment(new Rectangle(new Vector(100, 100)));
    const mode = new ImageExpandingMode();
    mode.activate(modeEnvironment);
    mode.setControls({...DEFAULT_EXPAND_IMAGE_CONTROLS, aspectRatio: [16, 9]});
    mode.setControls({
      ...DEFAULT_EXPAND_IMAGE_CONTROLS,
      aspectRatio: [16, 9],
      color: '#ff0000',
    });

    expect(modeEnvironment.zoomToFit).toHaveBeenCalledOnce();
    expect(modeEnvironment.requestRedraw).toHaveBeenCalledOnce();
  });

  it('darkens the Smart expansion margins instead of showing a fill color', () => {
    const mode = new ImageExpandingMode();
    mode.activate(createModeEnvironment(new Rectangle(new Vector(100, 100))));
    mode.setControls({
      ...DEFAULT_EXPAND_IMAGE_CONTROLS,
      sizeMode: ExpandImageSizeMode.Margins,
      marginX: 10,
      marginY: 0,
      fillMode: ExpandImageFillMode.Smart,
      color: '#ff0000',
    });
    const ctx = {
      fillStyle: '',
      fillRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    mode.onBeforeImageDrawn(ctx);

    expect(ctx.fillStyle).toBe(DARKENED_AREA_COLOR);
    expect(ctx.fillRect).toHaveBeenCalledTimes(2);
  });
});
