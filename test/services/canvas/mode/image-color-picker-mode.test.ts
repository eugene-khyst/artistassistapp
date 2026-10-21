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
  CanvasPointer,
  ImageCanvasRenderingContext,
} from '@/services/canvas/mode/canvas-mode';
import {
  ImageColorPickerEventType,
  ImageColorPickerMode,
  type PipettePointSetEvent,
} from '@/services/canvas/mode/image-color-picker-mode';
import {Rectangle, Vector} from '@/services/math/geometry';

describe('ImageColorPickerMode', () => {
  it('dims markers without changing their hit areas or the opacity of later drawing', () => {
    const mode = new ImageColorPickerMode();
    const dimmedPoint = new Vector(20, 20);
    mode.setSamples([
      {key: 'dimmed', imageCenteredPoint: dimmedPoint, rgb: [0, 0, 0], opacity: 0.5},
      {key: 'normal', imageCenteredPoint: new Vector(40, 40), rgb: [255, 255, 255]},
    ]);
    const opacities: number[] = [];
    const saved: number[] = [];
    const ctx = {
      globalAlpha: 1,
      save: () => saved.push(ctx.globalAlpha),
      restore: () => {
        ctx.globalAlpha = saved.pop()!;
      },
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: () => opacities.push(ctx.globalAlpha),
      stroke: vi.fn(),
    };

    mode.onImageDrawn(ctx as unknown as ImageCanvasRenderingContext);

    expect(opacities).toEqual([0.5, 1]);
    expect(ctx.globalAlpha).toBe(1);
    expect(mode.getSamplesNearby(dimmedPoint).map(({key}) => key)).toEqual(['dimmed']);
  });

  it('emits a complete pointer when the pipette point is set programmatically', () => {
    const imageCenteredPoint = new Vector(1, 2);
    const pointer: CanvasPointer = {
      canvasPoint: new Vector(61, 72),
      worldPoint: new Vector(11, 22),
      imageCenteredPoint,
      imagePoint: new Vector(51, 52),
    };
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
    const listener = vi.fn<(event: PipettePointSetEvent) => void>();
    const mode = new ImageColorPickerMode();
    mode.activate(context);
    mode.events.subscribe(ImageColorPickerEventType.PipettePointSet, listener);

    mode.setPipettePoint(pointer);
    mode.setPipettePoint(null);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining(pointer));
  });
});
