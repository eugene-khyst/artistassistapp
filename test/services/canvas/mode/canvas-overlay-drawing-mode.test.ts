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

import type {
  CanvasModeContext,
  ImageCanvasRenderingContext,
} from '@/services/canvas/mode/canvas-mode';
import {CanvasOverlayDrawingMode} from '@/services/canvas/mode/canvas-overlay-drawing-mode';
import {Rectangle, Vector} from '@/services/math/geometry';
import {IMAGE_SIZE} from '@/utils/graphics';

vi.mock('@/services/image/filter/invert-colors-webgl', () => ({
  invertColorsWebGL: vi.fn(),
}));

class TestOverlayDrawingMode extends CanvasOverlayDrawingMode {
  getEffectiveLineWidth(): number {
    return this.getLineWidth();
  }

  protected override drawOverlay(ctx: ImageCanvasRenderingContext): void {
    void ctx;
  }
}

describe('CanvasOverlayDrawingMode', () => {
  it('derives export line width without mutating the configured width', () => {
    let exporting = false;
    const context: CanvasModeContext = {
      getCanvas: () => ({}) as HTMLCanvasElement,
      getImages: () => [],
      getImageIndex: () => 0,
      getImageDimension: () => new Rectangle(new Vector(2 * IMAGE_SIZE.HD, 1)),
      getSourceImageDimension: () => new Rectangle(new Vector(2 * IMAGE_SIZE.HD, 1)),
      getZoom: () => 1,
      isExporting: () => exporting,
      zoomToFit: vi.fn(),
      requestRedraw: vi.fn(),
      refreshCursor: vi.fn(),
    };
    const mode = new TestOverlayDrawingMode({lineWidth: 2});
    mode.activate(context);

    expect(mode.getEffectiveLineWidth()).toBe(2);
    exporting = true;
    expect(mode.getEffectiveLineWidth()).toBe(4);
    exporting = false;
    expect(mode.getEffectiveLineWidth()).toBe(2);
  });
});
