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

import {gaussianBlurRenderPasses} from '@/services/image/filter/gaussian-blur-webgl';
import type {KernelSize} from '@/services/image/filter/types';
import {type RenderPass, WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import {copyOffscreenCanvas} from '@/utils/graphics';

import gaussianBlurFragmentShaderSource from './glsl/gaussian-blur.glsl';
import grayscaleFragmentShaderSource from './glsl/grayscale-oklab-lightness.glsl';
import thresholdFragmentShaderSource from './glsl/threshold.glsl';

export interface ThresholdParams {
  grayscaleInput?: boolean;
  gaussianBlurKernelSize?: KernelSize;
}

const desc = (a: number, b: number) => b - a;

export function thresholdFilterWebGL(
  image: OffscreenCanvas,
  thresholds: number[],
  values: number[],
  {grayscaleInput = false, gaussianBlurKernelSize}: ThresholdParams = {}
): OffscreenCanvas[] {
  const fragmentShaderSources: string[] = [];
  const uniformNames: string[][] = [];
  const renderPasses: RenderPass[] = [];
  let i = 0;
  if (!grayscaleInput) {
    renderPasses.push({programIndex: i++});
    fragmentShaderSources.push(grayscaleFragmentShaderSource);
    uniformNames.push([]);
  }
  if (gaussianBlurKernelSize !== undefined) {
    renderPasses.push(...gaussianBlurRenderPasses(gaussianBlurKernelSize, i++));
    fragmentShaderSources.push(gaussianBlurFragmentShaderSource);
    uniformNames.push(['u_kernel', 'u_kernelSize', 'u_direction']);
  }
  fragmentShaderSources.push(thresholdFragmentShaderSource);
  uniformNames.push(['u_thresholds', 'u_values', 'u_tone']);
  const renderer = new WebGLRenderer(fragmentShaderSources, uniformNames, image, {
    // Reduce lightness rounding between passes so pixels near a threshold stay in the correct band.
    floatRenderTargets: renderPasses.length > 0,
  });
  thresholds = [...thresholds].sort(desc);
  values = [...values].sort(desc);
  try {
    return thresholds.map((_, toneIndex) => {
      renderer.clear();
      renderer.render([
        ...renderPasses,
        {
          programIndex: i,
          setUniforms(gl, locations) {
            gl.uniform1fv(locations.get('u_thresholds')!, new Float32Array(thresholds));
            gl.uniform1fv(locations.get('u_values')!, new Float32Array(values));
            gl.uniform1i(locations.get('u_tone')!, toneIndex);
          },
        },
      ]);
      return copyOffscreenCanvas(renderer.canvas);
    });
  } finally {
    renderer.cleanUp();
  }
}
