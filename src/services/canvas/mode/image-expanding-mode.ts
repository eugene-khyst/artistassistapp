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

import {hexToRgb, rgbToHex} from '@eugene-khyst/artistassistapp-color-mixer';

import {getImageExpansion, type ImageExpansion} from '@/services/image/expand-image';
import {
  DEFAULT_EXPAND_IMAGE_CONTROLS,
  type ExpandImageControls,
  ExpandImageFillMode,
} from '@/services/image/expand-image-controls';
import {Rectangle} from '@/services/math/geometry';

import {BaseCanvasMode, DARKENED_AREA_COLOR, type ImageCanvasRenderingContext} from './canvas-mode';

const LINE_WIDTH = 1.5;

function invertColor(color: string): string {
  const [red, green, blue] = hexToRgb(color);
  return rgbToHex(255 - red, 255 - green, 255 - blue);
}

export class ImageExpandingMode extends BaseCanvasMode {
  private controls = DEFAULT_EXPAND_IMAGE_CONTROLS;

  setControls(controls: ExpandImageControls): void {
    const prevBounds = this.bounds();
    this.controls = controls;
    if (this.bounds().sameSize(prevBounds)) {
      this.context?.requestRedraw();
    } else {
      this.context?.zoomToFit();
    }
  }

  private sourceDimension(): Rectangle {
    return this.context?.getSourceImageDimension() ?? Rectangle.ZERO;
  }

  private expansion(dimension = this.sourceDimension()): ImageExpansion {
    return getImageExpansion(dimension, this.controls);
  }

  private bounds(): Rectangle {
    return this.expansion().bounds;
  }

  getImageDimension(dimension: Rectangle): Rectangle {
    return this.expansion(dimension).bounds;
  }

  getSourceImageRectangle(dimension: Rectangle): Rectangle {
    return this.expansion(dimension).sourceRectangle;
  }

  private isSmartFill(): boolean {
    return this.controls.fillMode === ExpandImageFillMode.Smart;
  }

  onBeforeImageDrawn(ctx: ImageCanvasRenderingContext): void {
    const {bounds, margins} = this.expansion();
    ctx.fillStyle = this.isSmartFill() ? DARKENED_AREA_COLOR : this.controls.color;
    for (const {topLeft, width, height} of margins) {
      ctx.fillRect(topLeft.x - bounds.center.x, topLeft.y - bounds.center.y, width, height);
    }
  }

  onImageDrawn(ctx: ImageCanvasRenderingContext): void {
    const {width, height, center} = this.expansion().bounds;
    const zoom = this.context?.getZoom() ?? 1;
    const lineWidth = LINE_WIDTH / zoom;
    const x = -center.x + lineWidth / 2;
    const y = -center.y + lineWidth / 2;
    ctx.lineWidth = lineWidth;
    // The margins take any color, so the outline inverts it to stay visible.
    ctx.strokeStyle = this.isSmartFill() ? '#fff' : invertColor(this.controls.color);
    ctx.strokeRect(x, y, width - lineWidth, height - lineWidth);
  }
}
