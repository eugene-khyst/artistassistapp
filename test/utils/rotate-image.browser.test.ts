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

import {describe, expect, it} from 'vitest';

import {rotateImage} from '@/utils/graphics';

function opaqueImage(width: number, height: number): ImageBitmap {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  return canvas.transferToImageBitmap();
}

function minAlpha(canvas: OffscreenCanvas): number {
  const ctx = canvas.getContext('2d')!;
  const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let min = 255;
  for (let i = 3; i < data.length; i += 4) {
    min = Math.min(min, data[i]!);
  }
  return min;
}

describe('rotateImageBitmap', () => {
  it('crops an opaque image so that no pixel is transparent', () => {
    const sizes = [
      [400, 300],
      [300, 400],
      [257, 257],
      [641, 123],
    ] as const;
    const angles = [-45, -30, -12.5, -1, -0.5, 0, 0.5, 1, 7, 10, 22.5, 33.5, 45];
    const failures: string[] = [];
    for (const [width, height] of sizes) {
      for (const angle of angles) {
        const rotated = rotateImage(opaqueImage(width, height), angle);
        const alpha = minAlpha(rotated);
        if (alpha < 255) {
          failures.push(`${width}x${height} at ${angle}°: alpha ${alpha}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
