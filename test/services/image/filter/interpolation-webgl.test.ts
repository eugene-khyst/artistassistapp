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

import {afterEach, describe, expect, it, vi} from 'vitest';

import {interpolationWebGL} from '@/services/image/filter/interpolation-webgl';
import {Interpolation} from '@/services/image/filter/types';
import type {RenderPass} from '@/services/image/filter/webgl-renderer';

const mocks = vi.hoisted(() => ({
  canvas: {width: 600, height: 400} as OffscreenCanvas,
  cleanUp: vi.fn(),
  constructor: vi.fn(),
  copyOffscreenCanvas: vi.fn(),
  render: vi.fn(),
}));

vi.mock('@/services/image/filter/glsl/bilinear-interpolation.glsl', () => ({default: 'bilinear'}));
vi.mock('@/services/image/filter/glsl/lanczos-interpolation.glsl', () => ({default: 'lanczos'}));
vi.mock('@/services/image/filter/glsl/linear-interpolation.glsl', () => ({default: 'linear'}));

vi.mock('@/services/image/filter/webgl-renderer', () => ({
  WebGLRenderer: class {
    canvas = mocks.canvas;

    constructor(...args: unknown[]) {
      mocks.constructor(...args);
    }

    render(...args: unknown[]) {
      mocks.render(...args);
    }

    cleanUp() {
      mocks.cleanUp();
    }
  },
}));

vi.mock('@/utils/graphics', () => ({copyOffscreenCanvas: mocks.copyOffscreenCanvas}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('interpolationWebGL', () => {
  it('uses one render pass for non-Lanczos interpolation', () => {
    const image = {width: 512, height: 512} as OffscreenCanvas;
    const result = {width: 600, height: 400} as OffscreenCanvas;
    mocks.copyOffscreenCanvas.mockReturnValue(result);

    expect(interpolationWebGL(image, 600, 400, Interpolation.Bilinear)).toBe(result);

    expect(mocks.constructor).toHaveBeenCalledExactlyOnceWith([expect.any(String)], [[]], image, {
      floatRenderTargets: false,
      premultiplyAlpha: true,
      size: [600, 400],
    });
    expect(mocks.render).toHaveBeenCalledExactlyOnceWith(undefined);
    expect(mocks.copyOffscreenCanvas).toHaveBeenCalledExactlyOnceWith(mocks.canvas);
    expect(mocks.cleanUp).toHaveBeenCalledOnce();
  });

  it('runs the vertical pass first when it produces the smaller intermediate image', () => {
    const image = {width: 512, height: 512} as OffscreenCanvas;

    interpolationWebGL(image, 600, 400, Interpolation.Lanczos);

    expect(mocks.constructor).toHaveBeenCalledExactlyOnceWith(
      [expect.any(String)],
      [['u_direction', 'u_sourceScale', 'u_clampPremultipliedAlpha']],
      image,
      {floatRenderTargets: true, premultiplyAlpha: true, size: [600, 400]}
    );
    const renderPasses = mocks.render.mock.calls[0]![0] as RenderPass[];
    expect(renderPasses).toHaveLength(2);
    expect(renderPasses[0]!.outputSize).toEqual([512, 400]);
    expect(renderPasses[1]!.outputSize).toEqual([600, 400]);

    const directionLocation = {} as WebGLUniformLocation;
    const sourceScaleLocation = {} as WebGLUniformLocation;
    const clampPremultipliedAlphaLocation = {} as WebGLUniformLocation;
    const locations = new Map([
      ['u_direction', directionLocation],
      ['u_sourceScale', sourceScaleLocation],
      ['u_clampPremultipliedAlpha', clampPremultipliedAlphaLocation],
    ]);
    const gl = {
      uniform1f: vi.fn(),
      uniform1i: vi.fn(),
      uniform2i: vi.fn(),
    } as unknown as WebGL2RenderingContext;

    renderPasses[0]!.setUniforms!(gl, locations);
    expect(gl.uniform2i).toHaveBeenLastCalledWith(directionLocation, 0, 1);
    expect(gl.uniform1f).toHaveBeenLastCalledWith(sourceScaleLocation, 512 / 400);
    expect(gl.uniform1i).toHaveBeenLastCalledWith(clampPremultipliedAlphaLocation, 0);

    renderPasses[1]!.setUniforms!(gl, locations);
    expect(gl.uniform2i).toHaveBeenLastCalledWith(directionLocation, 1, 0);
    expect(gl.uniform1f).toHaveBeenLastCalledWith(sourceScaleLocation, 512 / 600);
    expect(gl.uniform1i).toHaveBeenLastCalledWith(clampPremultipliedAlphaLocation, 1);
  });

  it('runs the horizontal pass first when it produces the smaller intermediate image', () => {
    const image = {width: 512, height: 512} as OffscreenCanvas;

    interpolationWebGL(image, 400, 600, Interpolation.Lanczos);

    const renderPasses = mocks.render.mock.calls[0]![0] as RenderPass[];
    expect(renderPasses.map(({outputSize}) => outputSize)).toEqual([
      [400, 512],
      [400, 600],
    ]);
  });

  it.each([
    {targetWidth: 600, targetHeight: 512},
    {targetWidth: 512, targetHeight: 400},
    {targetWidth: 512, targetHeight: 512},
  ])('omits the unchanged axis for $targetWidth x $targetHeight', ({targetWidth, targetHeight}) => {
    const image = {width: 512, height: 512} as OffscreenCanvas;

    interpolationWebGL(image, targetWidth, targetHeight, Interpolation.Lanczos);

    const renderPasses = mocks.render.mock.calls[0]![0] as RenderPass[];
    expect(renderPasses).toHaveLength(1);
    expect(renderPasses[0]!.outputSize).toEqual([targetWidth, targetHeight]);
  });

  it('cleans up the renderer when rendering fails', () => {
    const image = {width: 512, height: 512} as OffscreenCanvas;
    mocks.render.mockImplementationOnce(() => {
      throw new Error('render failed');
    });

    expect(() => interpolationWebGL(image, 600, 400, Interpolation.Lanczos)).toThrow(
      'render failed'
    );

    expect(mocks.copyOffscreenCanvas).not.toHaveBeenCalled();
    expect(mocks.cleanUp).toHaveBeenCalledOnce();
  });
});
