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

import fragmentShaderSource from '@/services/image/filter/glsl/brush-stroke.glsl';
import {WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import type {Float32Tensor} from '@/services/ml/tensor';
import type {ImageDimension} from '@/utils/graphics';

const STROKES_PER_PATCH = 100;
const PARAMETERS_PER_STROKE = 8;
const MERGE_EVERY = 10;
const OUTPUT_SCALE = 2;

export function renderBrushStrokesWebGL(
  strokes: Float32Tensor[],
  {vertical, horizontal}: {vertical: OffscreenCanvas; horizontal: OffscreenCanvas},
  {width, height}: ImageDimension,
  {
    patchSize,
    overlap,
    strokeScale,
  }: {
    patchSize: number;
    overlap: number;
    strokeScale: number;
  }
): OffscreenCanvas {
  const columns = Math.ceil(width / patchSize);
  const groupWidth = MERGE_EVERY * PARAMETERS_PER_STROKE;
  strokes.forEach(({dims}) => {
    if (dims.join() !== `1,${STROKES_PER_PATCH},${PARAMETERS_PER_STROKE}`) {
      throw new Error(`Painting expects strokes shaped [1, 100, 8], got [${dims.join(', ')}]`);
    }
  });
  let renderSize = Math.floor((patchSize + overlap) / strokeScale);
  renderSize += renderSize % 2;
  const border = (renderSize - patchSize) / 2;
  const scaledRenderSize = OUTPUT_SCALE * renderSize;
  const renderer = new WebGLRenderer(
    [fragmentShaderSource],
    [['u_parameters', 'u_parametersPerStroke', 'u_renderSize', 'u_strokeScale']],
    [vertical, horizontal],
    {
      premultiplyAlpha: true,
      mipmaps: true,
      size: {
        width: scaledRenderSize,
        height: scaledRenderSize,
      },
    }
  );
  try {
    const output = new OffscreenCanvas(OUTPUT_SCALE * width, OUTPUT_SCALE * height);
    const ctx = output.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, output.width, output.height);
    for (let start = 0; start < STROKES_PER_PATCH; start += MERGE_EVERY) {
      const groupStart = start * PARAMETERS_PER_STROKE;
      strokes.forEach(({data}, patch) => {
        renderer.render([
          {
            textures: [
              {
                name: 'u_parameters',
                source: {
                  data: data.subarray(groupStart, groupStart + groupWidth),
                  width: groupWidth,
                  height: 1,
                },
              },
            ],
            setUniforms: (gl, locations) => {
              gl.uniform1i(locations.get('u_parametersPerStroke')!, PARAMETERS_PER_STROKE);
              gl.uniform1i(locations.get('u_renderSize')!, scaledRenderSize);
              gl.uniform1f(locations.get('u_strokeScale')!, strokeScale);
            },
          },
        ]);
        ctx.drawImage(
          renderer.canvas,
          OUTPUT_SCALE * ((patch % columns) * patchSize - border),
          OUTPUT_SCALE * (Math.floor(patch / columns) * patchSize - border)
        );
      });
    }
    return output;
  } finally {
    renderer.cleanUp();
  }
}
