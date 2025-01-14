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

export abstract class Canvas {
  protected context: CanvasRenderingContext2D;

  constructor(public canvas: HTMLCanvasElement) {
    this.context = canvas.getContext('2d')!;
  }

  protected abstract draw(): void;

  protected onCanvasResized(): void {
    // noop
  }

  setSize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.onCanvasResized();
    this.draw();
  }

  resize(): void {
    this.setSize(this.canvas.offsetWidth, this.canvas.offsetHeight);
  }

  public destroy(): void {
    // noop
  }
}
