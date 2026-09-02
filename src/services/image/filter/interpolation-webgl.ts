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

import {Interpolation} from '@/services/image/filter/types';
import {type RenderPass, WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '@/utils/graphics';
import type {Size} from '@/utils/types';

import bilinearFragmentShaderSource from './glsl/bilinear-interpolation.glsl';
import lanczosFragmentShaderSource from './glsl/lanczos-interpolation.glsl';
import linearFragmentShaderSource from './glsl/linear-interpolation.glsl';

type Direction = readonly [x: number, y: number];

const HORIZONTAL: Direction = [1, 0];
const VERTICAL: Direction = [0, 1];

interface InterpolationConfig {
  fragmentShaderSource: string;
  uniformNames?: string[];
  floatRenderTargets?: boolean;
  renderPasses?: (
    image: OffscreenCanvas,
    targetWidth: number,
    targetHeight: number
  ) => RenderPass[];
}

const INTERPOLATIONS: Record<Interpolation, InterpolationConfig> = {
  [Interpolation.Linear]: {fragmentShaderSource: linearFragmentShaderSource},
  [Interpolation.Bilinear]: {fragmentShaderSource: bilinearFragmentShaderSource},
  [Interpolation.Lanczos]: {
    fragmentShaderSource: lanczosFragmentShaderSource,
    uniformNames: ['u_direction', 'u_sourceScale', 'u_clampPremultipliedAlpha'],
    floatRenderTargets: true,
    renderPasses: lanczosRenderPasses,
  },
};

export function interpolationWebGL(
  image: OffscreenCanvas,
  targetWidth: number,
  targetHeight: number,
  interpolation = Interpolation.Bilinear
): OffscreenCanvas {
  const {
    fragmentShaderSource,
    uniformNames = [],
    floatRenderTargets = false,
    renderPasses,
  } = INTERPOLATIONS[interpolation];
  const renderer = new WebGLRenderer([fragmentShaderSource], [uniformNames], image, {
    floatRenderTargets,
    premultiplyAlpha: true,
    size: [targetWidth, targetHeight],
  });
  try {
    renderer.render(renderPasses?.(image, targetWidth, targetHeight));
    return copyOffscreenCanvas(renderer.canvas);
  } finally {
    renderer.cleanUp();
  }
}

function lanczosRenderPasses(
  image: OffscreenCanvas,
  targetWidth: number,
  targetHeight: number
): RenderPass[] {
  const horizontalPass = (height: number, isLast = false) =>
    lanczosRenderPass(HORIZONTAL, image.width / targetWidth, [targetWidth, height], isLast);
  const verticalPass = (width: number, isLast = false) =>
    lanczosRenderPass(VERTICAL, image.height / targetHeight, [width, targetHeight], isLast);

  if (targetWidth === image.width) {
    return [verticalPass(targetWidth, true)];
  }
  if (targetHeight === image.height) {
    return [horizontalPass(targetHeight, true)];
  }

  const intermediatePixelCountAfterHorizontal = targetWidth * image.height;
  const intermediatePixelCountAfterVertical = image.width * targetHeight;
  return intermediatePixelCountAfterHorizontal <= intermediatePixelCountAfterVertical
    ? [horizontalPass(image.height), verticalPass(targetWidth, true)]
    : [verticalPass(image.width), horizontalPass(targetHeight, true)];
}

function lanczosRenderPass(
  direction: Direction,
  sourceScale: number,
  outputSize: Size,
  clampPremultipliedAlpha: boolean
): RenderPass {
  return {
    outputSize,
    setUniforms(gl, locations) {
      gl.uniform2i(locations.get('u_direction')!, ...direction);
      gl.uniform1f(locations.get('u_sourceScale')!, sourceScale);
      gl.uniform1i(locations.get('u_clampPremultipliedAlpha')!, Number(clampPremultipliedAlpha));
    },
  };
}
