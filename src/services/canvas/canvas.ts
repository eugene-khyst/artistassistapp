/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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
