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
import {CanvasPolygonDrawingMode} from '@/services/canvas/mode/canvas-polygon-drawing-mode';
import {Rectangle, Vector} from '@/services/math/geometry';

vi.mock('@/services/image/filter/invert-colors-webgl', () => ({
  invertColorsWebGL: vi.fn(),
}));

function createContext(): CanvasModeContext {
  return {
    getCanvas: () => ({}) as HTMLCanvasElement,
    getImages: () => [],
    getImageIndex: () => 0,
    getImageDimension: () => new Rectangle(new Vector(100, 100)),
    getZoom: () => 1,
    isExporting: () => false,
    requestRedraw: vi.fn(),
    refreshCursor: vi.fn(),
  };
}

function createRenderingContext() {
  const closePath = vi.fn();
  const ctx = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath,
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    stroke: vi.fn(),
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    strokeStyle: '#000',
  } as unknown as ImageCanvasRenderingContext;
  return {ctx, closePath};
}

describe('CanvasPolygonDrawingMode', () => {
  it('connects and closes two or more vertices by default', () => {
    const mode = new CanvasPolygonDrawingMode();
    mode.activate(createContext());
    const {ctx, closePath} = createRenderingContext();
    mode.setVertices([new Vector(10, 10)]);

    mode.onImageDrawn(ctx);

    expect(closePath).not.toHaveBeenCalled();
    mode.setVertices([new Vector(10, 10), new Vector(90, 90)]);

    mode.onImageDrawn(ctx);

    expect(closePath).toHaveBeenCalledOnce();
  });

  it('allows connecting vertices only when the override accepts them', () => {
    const mode = new CanvasPolygonDrawingMode({
      maxVertexCount: 4,
      shouldConnectVertices: vertices => vertices.length === 4,
    });
    mode.activate(createContext());
    const {ctx, closePath} = createRenderingContext();
    mode.setVertices([new Vector(10, 10), new Vector(90, 10), new Vector(90, 90)]);

    mode.onImageDrawn(ctx);

    expect(closePath).not.toHaveBeenCalled();
    mode.setVertices([
      new Vector(10, 10),
      new Vector(90, 10),
      new Vector(90, 90),
      new Vector(10, 90),
    ]);

    mode.onImageDrawn(ctx);

    expect(closePath).toHaveBeenCalledOnce();
  });
});
