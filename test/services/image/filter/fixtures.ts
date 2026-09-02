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

export type Pixel = readonly [r: number, g: number, b: number, a: number];

export function createImage(
  width: number,
  height: number,
  pixel: (x: number, y: number) => Pixel
): OffscreenCanvas {
  const imageData = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      imageData.data.set(pixel(x, y), 4 * (y * width + x));
    }
  }
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext('2d')!.putImageData(imageData, 0, 0);
  return canvas;
}

export function readImage(canvas: OffscreenCanvas): ImageData {
  return canvas
    .getContext('2d', {willReadFrequently: true})!
    .getImageData(0, 0, canvas.width, canvas.height);
}

export function pixelAt({data, width}: ImageData, x: number, y: number): Pixel {
  const i = 4 * (y * width + x);
  return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
}
