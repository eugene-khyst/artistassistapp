/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import type {OverlayDrawingCanvasProps} from '~/src/services/canvas/image/overlay-drawing-canvas';
import {OverlayDrawingCanvas} from '~/src/services/canvas/image/overlay-drawing-canvas';
import {sortVertices} from '~/src/services/image/perspective-correction';
import type {Rectangle, Vector} from '~/src/services/math/geometry';

export interface ImagePerspectiveCorrectionCanvasProps extends OverlayDrawingCanvasProps {
  vertexDiameter?: number;
}

export class ImagePerspectiveCorrectionCanvas extends OverlayDrawingCanvas {
  private readonly vertexDiameter: number;
  private vertices: Vector[] = [];
  private activeVertex?: Vector | null = null;
  private inactiveVertices: Vector[] = [];

  constructor(canvas: HTMLCanvasElement, props: ImagePerspectiveCorrectionCanvasProps = {}) {
    super(canvas, props);

    ({vertexDiameter: this.vertexDiameter = 20} = props);
  }

  protected override getCursor(): string {
    return this.vertices.length < 4 ? 'crosshair' : super.getCursor();
  }

  protected override onImagesLoaded(): void {
    super.onImagesLoaded();
    this.resetVertices();
  }

  private drawQuadrilateral(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    for (let i = 0; i < this.vertices.length; i++) {
      const v1 = this.vertices[i]!;
      ctx.lineWidth = this.lineWidth / this.zoom;
      this.drawCircle(ctx, v1, this.vertexDiameter / (2 * this.zoom));
      ctx.stroke();
      this.drawCircle(ctx, v1, 1 / this.zoom);
      ctx.stroke();
      if (this.vertices.length >= 4) {
        const v2 = this.vertices[(i + 1) % this.vertices.length]!;
        this.drawLine(ctx, v1, v2);
      }
    }
  }

  protected override drawOverlay(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
  ): void {
    this.drawQuadrilateral(ctx);
  }

  private addVertex(vertex: Vector): void {
    if (this.vertices.length < 4) {
      this.vertices.push(vertex);
      if (this.vertices.length === 4) {
        this.vertices = sortVertices(this.vertices);
      }
      this.requestRedraw();
    }
  }

  resetVertices(): void {
    this.vertices = [];
    this.requestRedraw();
  }

  getVertices(): Vector[] {
    const {center}: Rectangle = this.getImageDimension();
    return this.vertices.map((vertex: Vector) => vertex.add(center));
  }

  protected override onDragStart(point: Vector): void {
    const index: number = this.vertices.findIndex((vertex: Vector) => {
      return vertex.subtract(point).length() < this.vertexDiameter / this.zoom;
    });
    if (index >= 0) {
      this.inactiveVertices = this.vertices.slice();
      [this.activeVertex] = this.inactiveVertices.splice(index, 1);
    }
  }

  protected override onDrag(point: Vector, dragStart: Vector): void {
    if (!this.activeVertex) {
      super.onDrag(point, dragStart);
      return;
    }
    if (!this.imageContains(point)) {
      return;
    }
    this.activeVertex = point.subtract(this.offset);
    this.vertices = [...this.inactiveVertices, this.activeVertex];
    if (this.vertices.length === 4) {
      this.vertices = sortVertices(this.vertices);
    }
  }

  protected override onDragEnd(): void {
    this.activeVertex = null;
    this.inactiveVertices = [];
  }

  protected override onClickOrTap(point: Vector): void {
    if (this.imageContains(point)) {
      this.addVertex(point);
    }
  }
}
