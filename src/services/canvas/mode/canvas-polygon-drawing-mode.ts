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

import {Polygon, Vector} from '@/services/math/geometry';

import type {CanvasDrag, CanvasPointer, ImageCanvasRenderingContext} from './canvas-mode';
import {
  CanvasOverlayDrawingMode,
  type CanvasOverlayDrawingModeProps,
} from './canvas-overlay-drawing-mode';

export interface CanvasPolygonDrawingModeProps extends CanvasOverlayDrawingModeProps {
  maxVertexCount?: number;
  vertexRadius?: number;
  vertexDragRadius?: number;
  shouldSortVertices?: boolean;
  shouldConnectVertices?: (vertices: readonly Vector[]) => boolean;
  canRemoveVertices?: boolean;
  onVerticesChange?: (vertices: readonly Vector[]) => void;
}

export class CanvasPolygonDrawingMode extends CanvasOverlayDrawingMode {
  private readonly maxVertexCount: number;
  private readonly vertexRadius: number;
  private readonly vertexDragRadius: number;
  private readonly shouldSortVertices: boolean;
  private readonly shouldConnectVertices: (vertices: readonly Vector[]) => boolean;
  private readonly canRemoveVertices: boolean;
  private readonly onVerticesChange?: (vertices: readonly Vector[]) => void;
  private polygon = new Polygon([]);

  constructor({
    maxVertexCount = Number.POSITIVE_INFINITY,
    vertexRadius = 10,
    vertexDragRadius = 20,
    shouldSortVertices = false,
    shouldConnectVertices = vertices => vertices.length >= 2,
    canRemoveVertices = false,
    onVerticesChange,
    ...props
  }: CanvasPolygonDrawingModeProps = {}) {
    super(props);
    this.maxVertexCount = maxVertexCount;
    this.vertexRadius = vertexRadius;
    this.vertexDragRadius = vertexDragRadius;
    this.shouldSortVertices = shouldSortVertices;
    this.shouldConnectVertices = shouldConnectVertices;
    this.canRemoveVertices = canRemoveVertices;
    this.onVerticesChange = onVerticesChange;
  }

  getCursor(): string | undefined {
    return this.polygon.vertices.length < this.maxVertexCount ? 'crosshair' : undefined;
  }

  override onImagesLoaded(): void {
    super.onImagesLoaded();
    this.resetVertices();
  }

  protected override drawOverlay(ctx: ImageCanvasRenderingContext): void {
    const zoom = this.context?.getZoom() ?? 1;
    const {center} = this.imageDimension();
    const vertices = this.polygon.vertices.map(vertex => vertex.subtract(center));
    for (const vertex of vertices) {
      ctx.lineWidth = this.getLineWidth() / zoom;
      this.drawCircle(ctx, vertex, this.vertexRadius / zoom);
      ctx.stroke();
      this.drawCircle(ctx, vertex, 1 / zoom);
      ctx.stroke();
    }
    if (this.shouldConnectVertices(this.polygon.vertices)) {
      ctx.lineWidth = this.getLineWidth() / zoom;
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.moveTo(vertices[0]!.x, vertices[0]!.y);
      for (const {x, y} of vertices.slice(1)) {
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  private notifyVerticesChange(): void {
    this.onVerticesChange?.(this.getVertices());
  }

  private updateVertices(vertices: readonly Vector[]): void {
    const polygon = new Polygon(vertices);
    this.polygon = this.shouldSortVertices ? polygon.sortVertices() : polygon;
    this.notifyVerticesChange();
    this.context?.requestRedraw();
  }

  private addVertex(vertex: Vector): void {
    if (this.polygon.vertices.length < this.maxVertexCount) {
      this.updateVertices([...this.polygon.vertices, vertex]);
      this.context?.refreshCursor();
    }
  }

  private resetVertices(): void {
    this.updateVertices([]);
    this.context?.refreshCursor();
  }

  setVertices(vertices: readonly Vector[]): void {
    this.updateVertices(vertices.slice(0, this.maxVertexCount));
    this.context?.refreshCursor();
  }

  getVertices(): Vector[] {
    return this.polygon.vertices.map(({x, y}) => new Vector(x, y));
  }

  private vertexIndexAt(imagePoint: Vector, radius: number) {
    const zoom = this.context?.getZoom() ?? 1;
    return this.polygon.vertices.findIndex(
      vertex => vertex.subtract(imagePoint).length() < radius / zoom
    );
  }

  startDrag({imagePoint}: CanvasPointer): CanvasDrag | undefined {
    const index = this.vertexIndexAt(imagePoint, this.vertexDragRadius);
    if (index < 0) {
      return;
    }
    const initialVertices = this.getVertices();
    const inactiveVertices = this.polygon.vertices.filter(
      (_, vertexIndex) => vertexIndex !== index
    );
    return {
      move: ({imagePoint}: CanvasPointer) => {
        if (this.imageDimension().contains(imagePoint)) {
          this.updateVertices([
            ...inactiveVertices.slice(0, index),
            imagePoint,
            ...inactiveVertices.slice(index),
          ]);
        }
      },
      end: () => undefined,
      cancel: () => {
        this.updateVertices(initialVertices);
      },
    };
  }

  onClickOrTap({imagePoint}: CanvasPointer): boolean {
    if (this.canRemoveVertices) {
      const index = this.vertexIndexAt(imagePoint, this.vertexRadius);
      if (index >= 0) {
        this.updateVertices(this.polygon.vertices.filter((_, i) => i !== index));
        this.context?.refreshCursor();
        return true;
      }
    }
    if (this.imageDimension().contains(imagePoint)) {
      this.addVertex(imagePoint);
    }
    return true;
  }
}
