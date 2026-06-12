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

import {rgbToHex, type RgbTuple} from '@/services/color/space/rgb';
import {WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import type {DrawImageSource} from '@/utils/graphics';
import {copyOffscreenCanvas} from '@/utils/graphics';

import fragmentShaderSource from './glsl/color-map.glsl';

const COLOR_MAP_STOP_RGBS: RgbTuple[] = [
  [0, 0, 0],
  [25, 41, 28],
  [45, 60, 103],
  [89, 62, 117],
  [152, 75, 111],
  [210, 93, 78],
  [217, 135, 75],
  [202, 187, 72],
  [183, 225, 151],
  [194, 247, 242],
  [255, 255, 255],
];
export const COLOR_MAP_STOP_HEXES: string[] = COLOR_MAP_STOP_RGBS.map(([r, g, b]) =>
  rgbToHex(r, g, b)
);

export function colorMapFilterWebGL(
  image: DrawImageSource,
  colorMapStops = COLOR_MAP_STOP_RGBS
): [OffscreenCanvas, ImageData] {
  const renderer = new WebGLRenderer([fragmentShaderSource], [['u_colorMap']], image);
  const colorMap = createColorMapImageData(colorMapStops);
  renderer.render([
    {
      textures: [{name: 'u_colorMap', source: colorMap}],
    },
  ]);
  const result = copyOffscreenCanvas(renderer.canvas);
  renderer.cleanUp();
  return [result, colorMap];
}

function createColorMapImageData(colorMapStops: RgbTuple[]): ImageData {
  if (!colorMapStops.length) {
    throw new Error('Color map must include at least one stop');
  }

  const data = new Uint8ClampedArray(colorMapStops.length * 4);
  colorMapStops.forEach((stop, i) => {
    const [r, g, b] = stop;
    const offset = i * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
  });
  return new ImageData(data, colorMapStops.length, 1);
}
