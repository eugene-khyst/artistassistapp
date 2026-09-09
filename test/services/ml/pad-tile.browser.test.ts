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

import {padTile} from '@/services/ml/tiled-image-transformer';

function opaqueCanvas(width: number, height: number, color: string): OffscreenCanvas {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

describe('padTile', () => {
  it('leaves a tile that already fits the multiple untouched', () => {
    const tile = opaqueCanvas(32, 32, '#000');
    expect(padTile(tile, 16)).toBe(tile);
    expect(padTile(tile, undefined)).toBe(tile);
  });

  // Smoothing samples the transparent rows below the source strip, and preprocessing
  // then composites that onto white, giving the model a bright border it invented.
  it('pads an opaque tile without introducing transparency', () => {
    const padded = padTile(opaqueCanvas(17, 17, '#000'), 32);
    expect([padded.width, padded.height]).toEqual([32, 32]);
    const {data} = padded.getContext('2d')!.getImageData(0, 0, 32, 32);
    let minAlpha = 255;
    for (let i = 3; i < data.length; i += 4) {
      minAlpha = Math.min(minAlpha, data[i]!);
    }
    expect(minAlpha).toBe(255);
  });

  it('replicates the edge pixels rather than blending them', () => {
    const tile = opaqueCanvas(17, 17, '#000');
    const ctx = tile.getContext('2d')!;
    ctx.fillStyle = '#f00';
    ctx.fillRect(16, 0, 1, 17);
    ctx.fillRect(0, 16, 17, 1);
    const {data} = padTile(tile, 32).getContext('2d')!.getImageData(0, 0, 32, 32);
    const at = (x: number, y: number) => [...data.slice(4 * (y * 32 + x), 4 * (y * 32 + x) + 4)];
    expect(at(31, 5)).toEqual([255, 0, 0, 255]);
    expect(at(5, 31)).toEqual([255, 0, 0, 255]);
    expect(at(31, 31)).toEqual([255, 0, 0, 255]);
  });
});
