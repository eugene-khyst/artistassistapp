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

import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {
  CanvasModeContext,
  ImageCanvasRenderingContext,
} from '@/services/canvas/mode/canvas-mode';
import {CanvasOverlayDrawingMode} from '@/services/canvas/mode/canvas-overlay-drawing-mode';
import {Rectangle, Vector} from '@/services/math/geometry';
import type * as graphics from '@/utils/graphics';
import {IMAGE_SIZE} from '@/utils/graphics';

const invertMocks = vi.hoisted(() => ({invertColorsWebGL: vi.fn()}));

vi.mock('@/services/image/filter/invert-colors-webgl', () => invertMocks);

// The production helper returns a canvas unchanged, which is all these images need to be.
vi.mock('@/utils/graphics', async importOriginal => ({
  ...(await importOriginal<typeof graphics>()),
  toOffscreenCanvas: (image: unknown) => image,
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

  /**
   * The editor passes three images and displays one. Inverting all of them costs three WebGL
   * contexts and three shader compiles on the main thread every time Straighten or Crop opens.
   */
  describe('inverted image used to tint the overlay', () => {
    const images = ['edited', 'beforeLastEdit', 'original'];

    function createMode(): {
      mode: TestOverlayDrawingMode;
      draw: () => void;
      setIndex: (i: number) => void;
    } {
      let imageIndex = 0;
      const context = {
        getCanvas: () => ({}) as HTMLCanvasElement,
        getImages: () => images as unknown as ImageBitmap[],
        getImageIndex: () => imageIndex,
        getImageDimension: () => new Rectangle(new Vector(4, 2)),
        getSourceImageDimension: () => new Rectangle(new Vector(4, 2)),
        getZoom: () => 1,
        isExporting: () => false,
        zoomToFit: vi.fn(),
        requestRedraw: vi.fn(),
        refreshCursor: vi.fn(),
      } satisfies CanvasModeContext;
      const mode = new TestOverlayDrawingMode();
      mode.activate(context);
      const ctx = {
        globalCompositeOperation: 'source-over',
        drawImage: vi.fn(),
      } as unknown as ImageCanvasRenderingContext;
      return {
        mode,
        draw: () => {
          mode.onBeforeImageDrawn(ctx);
        },
        setIndex: (index: number) => {
          imageIndex = index;
        },
      };
    }

    const invertedImages = (): unknown[] =>
      invertMocks.invertColorsWebGL.mock.calls.map(([image]: unknown[]) => image);

    beforeEach(() => {
      invertMocks.invertColorsWebGL.mockReset();
      invertMocks.invertColorsWebGL.mockImplementation((image: string) => `inverted ${image}`);
    });

    it('inverts nothing until something is drawn', () => {
      const {mode} = createMode();

      mode.onImagesLoaded();

      expect(invertMocks.invertColorsWebGL).not.toHaveBeenCalled();
    });

    it('inverts only the image being drawn, and only once', () => {
      const {draw} = createMode();

      draw();
      draw();

      expect(invertMocks.invertColorsWebGL).toHaveBeenCalledExactlyOnceWith(
        'edited',
        IMAGE_SIZE.HD
      );
    });

    it('inverts another image only when it becomes the one on screen', () => {
      const {draw, setIndex} = createMode();

      draw();
      setIndex(2);
      draw();
      draw();

      expect(invertedImages()).toEqual(['edited', 'original']);
    });

    it('inverts again after the images change', () => {
      const {mode, draw} = createMode();

      draw();
      mode.onImagesLoaded();
      draw();

      expect(invertedImages()).toEqual(['edited', 'edited']);
    });
  });
});
