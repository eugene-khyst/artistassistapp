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

import {Vector} from '~/src/services/math/geometry';

export abstract class Canvas {
  protected context: CanvasRenderingContext2D;
  private redrawRequested = false;
  private animationFrameId: ReturnType<typeof requestAnimationFrame> | null = null;

  constructor(public canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;
    this.startRenderLoop();
  }

  protected abstract draw(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void;

  private startRenderLoop(): void {
    const render = () => {
      if (this.redrawRequested) {
        this.draw(this.context);
        this.redrawRequested = false;
      }
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  requestRedraw(): void {
    this.redrawRequested = true;
  }

  protected onCanvasResized(): void {
    // noop
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.onCanvasResized();
    this.requestRedraw();
  }

  resize(): void {
    this.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  protected getCanvasCenter(): Vector {
    return new Vector(this.canvas.width / 2, this.canvas.height / 2);
  }
}
