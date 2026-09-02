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

import type {CanvasMode, CanvasModeContext} from '@/services/canvas/mode/canvas-mode';
import {CompositeCanvasMode} from '@/services/canvas/mode/composite-canvas-mode';
import {Rectangle, Vector} from '@/services/math/geometry';

function createMode(): CanvasMode {
  return {
    activate: vi.fn(),
    deactivate: vi.fn(),
    destroy: vi.fn(),
    onImagesLoaded: vi.fn(),
  };
}

const context: CanvasModeContext = {
  getCanvas: () => ({}) as HTMLCanvasElement,
  getImages: () => [],
  getImageIndex: () => 0,
  getImageDimension: () => new Rectangle(new Vector(100, 100)),
  getSourceImageDimension: () => new Rectangle(new Vector(100, 100)),
  getZoom: () => 1,
  isExporting: () => false,
  zoomToFit: vi.fn(),
  requestRedraw: vi.fn(),
  refreshCursor: vi.fn(),
};

describe('CompositeCanvasMode', () => {
  it('activates only the selected mode and lazily loads current images', () => {
    const first = createMode();
    const second = createMode();
    const composite = new CompositeCanvasMode<'first' | 'second'>({first, second}, 'first');

    composite.activate(context);
    composite.onImagesLoaded();
    composite.setActiveMode('second');
    composite.setActiveMode('first');

    expect(first.activate).toHaveBeenCalledTimes(2);
    expect(first.deactivate).toHaveBeenCalledTimes(1);
    expect(first.onImagesLoaded).toHaveBeenCalledTimes(1);
    expect(second.activate).toHaveBeenCalledTimes(1);
    expect(second.deactivate).toHaveBeenCalledTimes(1);
    expect(second.onImagesLoaded).toHaveBeenCalledTimes(1);
  });

  it('supports a selected mode with no canvas behavior', () => {
    const mode = createMode();
    const composite = new CompositeCanvasMode<'mode' | 'none'>({mode, none: null}, 'mode');

    composite.activate(context);
    composite.setActiveMode('none');

    expect(composite.getActiveMode()).toBeNull();
    expect(mode.deactivate).toHaveBeenCalledTimes(1);
  });
});
