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

import {clamp} from '@eugene-khyst/artistassistapp-color-mixer';
import {getSwatchCellSize} from '@eugene-khyst/artistassistapp-image-processing/color/swatch-color';
import {Rectangle, Vector} from '@eugene-khyst/artistassistapp-image-processing/math/geometry';
import type {DrawImageSource} from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';

import {
  BaseCanvasMode,
  type CanvasDrag,
  type CanvasPointer,
  type ImageCanvasRenderingContext,
} from './canvas-mode';

export type ComparisonRegions = readonly [Rectangle | null, Rectangle | null];

// Screen pixels, so a square stays easy to grab by touch at any zoom.
const REGION_DRAG_RADIUS = 20;

interface ImageComparisonModeProps {
  onChange: (regions: ComparisonRegions) => void;
  getInitialRegions?: (image: DrawImageSource) => ComparisonRegions;
}

export class ImageComparisonMode extends BaseCanvasMode {
  private regions: [Rectangle | null, Rectangle | null] = [null, null];

  constructor(private readonly props: ImageComparisonModeProps) {
    super();
  }

  onImagesLoaded(): void {
    const image = this.context?.getImages()[this.context.getImageIndex()];
    const detected = image ? this.props.getInitialRegions?.(image) : undefined;
    this.regions = image
      ? [detected?.[0] ?? this.centeredRegion(0), detected?.[1] ?? this.centeredRegion(1)]
      : [null, null];
    this.emitChange();
  }

  private centeredRegion(index: 0 | 1): Rectangle {
    const dimension = this.imageDimension();
    const size = getSwatchCellSize(dimension);
    const left = dimension.center.x - (index === 0 ? size : 0);
    return Rectangle.fromTopLeft(
      new Vector(clamp(left, 0, dimension.width - size), (dimension.height - size) / 2),
      size,
      size
    );
  }

  getRegions(): ComparisonRegions {
    return [...this.regions];
  }

  private emitChange(): void {
    this.props.onChange(this.getRegions());
  }

  private regionIndexAt(point: Vector): 0 | 1 | undefined {
    const radius = REGION_DRAG_RADIUS / (this.context?.getZoom() ?? 1);
    let nearestIndex: 0 | 1 | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const index of [0, 1] as const) {
      const region = this.regions[index];
      if (!region?.contains(point, -radius)) {
        continue;
      }
      const distance = region.center.subtract(point).length();
      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    }
    return nearestIndex;
  }

  startDrag(start: CanvasPointer): CanvasDrag | undefined {
    const index = this.regionIndexAt(start.imagePoint);
    if (index === undefined) {
      return undefined;
    }
    const initial = this.regions[index]!;
    return {
      move: pointer => {
        const delta = pointer.imagePoint.subtract(start.imagePoint);
        const {width, height} = this.imageDimension();
        this.regions[index] = Rectangle.fromTopLeft(
          new Vector(
            clamp(initial.topLeft.x + delta.x, 0, width - initial.width),
            clamp(initial.topLeft.y + delta.y, 0, height - initial.height)
          ),
          initial.width,
          initial.height
        );
        this.context?.requestRedraw();
      },
      end: () => {
        this.emitChange();
      },
      cancel: () => {
        this.regions[index] = initial;
        this.context?.requestRedraw();
      },
    };
  }

  onImageDrawn(ctx: ImageCanvasRenderingContext): void {
    this.inImageCoordinates(ctx, () => {
      const zoom = this.context?.getZoom() ?? 1;
      for (const rectangle of this.regions) {
        if (!rectangle) {
          continue;
        }
        const {x, y} = rectangle.topLeft;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3 / zoom;
        ctx.strokeRect(x, y, rectangle.width, rectangle.height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(x, y, rectangle.width, rectangle.height);
      }
    });
  }
}
