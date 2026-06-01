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

import {clamp} from '@/utils/math-utils';

// Pixel-center mapping `srcCoord = (dstCoord + 0.5) * scale - 0.5` with replicate-edge clamping.
export function bilinearInterpolation(
  src: Float32Array,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const dst = new Float32Array(dstWidth * dstHeight);
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;
  for (let dy = 0; dy < dstHeight; dy++) {
    const sy = (dy + 0.5) * scaleY - 0.5;
    const y0 = Math.floor(sy);
    const fy = sy - y0;
    const row0 = clamp(y0, 0, srcHeight - 1) * srcWidth;
    const row1 = clamp(y0 + 1, 0, srcHeight - 1) * srcWidth;
    for (let dx = 0; dx < dstWidth; dx++) {
      const sx = (dx + 0.5) * scaleX - 0.5;
      const x0 = Math.floor(sx);
      const fx = sx - x0;
      const cx0 = clamp(x0, 0, srcWidth - 1);
      const cx1 = clamp(x0 + 1, 0, srcWidth - 1);
      const v00 = src[row0 + cx0]!;
      const v01 = src[row0 + cx1]!;
      const v10 = src[row1 + cx0]!;
      const v11 = src[row1 + cx1]!;
      const top = v00 + (v01 - v00) * fx;
      const bottom = v10 + (v11 - v10) * fx;
      dst[dy * dstWidth + dx] = top + (bottom - top) * fy;
    }
  }
  return dst;
}
