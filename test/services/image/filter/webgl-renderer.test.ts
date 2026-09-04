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

import {WebGLRenderer} from '@/services/image/filter/webgl-renderer';
import type {ImageDimension} from '@/utils/graphics';

vi.mock('@/services/image/filter/glsl/vertex.glsl', () => ({default: 'vertex'}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function mockRenderer({
  floatRenderTargets = true,
  framebufferStatus = 0x8cd5,
}: {
  floatRenderTargets?: boolean;
  framebufferStatus?: GLenum;
} = {}) {
  const texture = {} as WebGLTexture;
  const framebuffer = {} as WebGLFramebuffer;
  const texImage2D = vi.fn();
  const gl = {
    CLAMP_TO_EDGE: 0x812f,
    COLOR_ATTACHMENT0: 0x8ce0,
    FRAMEBUFFER: 0x8d40,
    FRAMEBUFFER_COMPLETE: 0x8cd5,
    HALF_FLOAT: 0x140b,
    LINEAR: 0x2601,
    MAX_TEXTURE_IMAGE_UNITS: 0x8872,
    NEAREST: 0x2600,
    NO_ERROR: 0,
    RGBA: 0x1908,
    RGBA16F: 0x881a,
    TEXTURE0: 0x84c0,
    TEXTURE_2D: 0x0de1,
    TEXTURE_2D_ARRAY: 0x8c1a,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    TRIANGLES: 0x0004,
    UNSIGNED_BYTE: 0x1401,
    activeTexture: vi.fn(),
    bindFramebuffer: vi.fn(),
    bindTexture: vi.fn(),
    bindVertexArray: vi.fn(),
    createFramebuffer: vi.fn(() => framebuffer),
    createTexture: vi.fn(() => texture),
    drawArrays: vi.fn(),
    framebufferTexture2D: vi.fn(),
    checkFramebufferStatus: vi.fn(() => framebufferStatus),
    getError: vi.fn(() => 0),
    getParameter: vi.fn(() => 16),
    texImage2D,
    texParameteri: vi.fn(),
    uniform1f: vi.fn(),
    uniform1i: vi.fn(),
    useProgram: vi.fn(),
    viewport: vi.fn(),
  } as unknown as WebGL2RenderingContext;
  const renderer = Object.assign(Object.create(WebGLRenderer.prototype) as WebGLRenderer, {
    canvas: {width: 600, height: 400} as OffscreenCanvas,
    floatRenderTargets,
    framebuffers: [],
    gl,
    imageTarget: gl.TEXTURE_2D,
    imageTexture: {},
    renderTargets: [],
    maxTextureSize: 4096,
    maxViewportSize: {width: 4096, height: 4096},
    programs: [{}],
    textureUniformName: 'u_texture',
    textures: [],
    texturesByUnit: new Map(),
    uniformLocations: [
      new Map<string, WebGLUniformLocation | null>([
        ['u_flipY', null],
        ['u_texture', null],
      ]),
    ],
    vaos: [{}],
  });
  return {gl, renderer, texImage2D};
}

function mockRendererConstruction({
  drawingBufferSize = {width: 10, height: 10},
  extensions = ['EXT_color_buffer_float'],
  maxTextureSize = 4096,
  maxViewportSize = {width: 4096, height: 4096},
}: {
  drawingBufferSize?: ImageDimension;
  extensions?: string[];
  maxTextureSize?: number;
  maxViewportSize?: ImageDimension;
} = {}) {
  const getExtension = vi.fn((name: string) => (extensions.includes(name) ? {} : null));
  const pixelStorei = vi.fn();
  const getContext = vi.fn((_type: string, _options: object) => {
    return {
      drawingBufferHeight: drawingBufferSize.height,
      drawingBufferWidth: drawingBufferSize.width,
      FRAGMENT_SHADER: 0x8b30,
      MAX_TEXTURE_SIZE: 0x0d33,
      MAX_VIEWPORT_DIMS: 0x0d3a,
      TEXTURE_2D: 0x0de1,
      UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241,
      VERTEX_SHADER: 0x8b31,
      getParameter: vi.fn((parameter: GLenum) =>
        parameter === 0x0d33
          ? maxTextureSize
          : new Int32Array([maxViewportSize.width, maxViewportSize.height])
      ),
      getExtension,
      getUniformLocation: vi.fn(() => null),
      pixelStorei,
    } as unknown as WebGL2RenderingContext;
  });
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        readonly width: number,
        readonly height: number
      ) {}
      getContext(type: string, options: object) {
        return getContext(type, options);
      }
    }
  );
  const rendererPrototype = WebGLRenderer.prototype as unknown as {
    compileShader(type: GLenum, source: string): WebGLShader;
    createTexture(source?: TexImageSource): WebGLTexture;
    createVertexArray(program: WebGLProgram): WebGLVertexArrayObject;
    linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram;
  };
  vi.spyOn(rendererPrototype, 'compileShader').mockReturnValue({});
  vi.spyOn(rendererPrototype, 'linkProgram').mockReturnValue({});
  vi.spyOn(rendererPrototype, 'createVertexArray').mockReturnValue({});
  vi.spyOn(rendererPrototype, 'createTexture').mockReturnValue({});
  return {getContext, getExtension, pixelStorei};
}

describe('WebGLRenderer', () => {
  it('pairs the texture upload alpha with the drawing buffer alpha', () => {
    const {getContext, pixelStorei} = mockRendererConstruction();

    new WebGLRenderer(['fragment'], [[]], {width: 10, height: 10} as OffscreenCanvas, {
      premultiplyAlpha: true,
    });

    expect(getContext).toHaveBeenCalledExactlyOnceWith('webgl2', {
      antialias: false,
      premultipliedAlpha: true,
    });
    expect(pixelStorei).toHaveBeenCalledExactlyOnceWith(0x9241, true);

    getContext.mockClear();
    pixelStorei.mockClear();
    new WebGLRenderer(['fragment'], [[]], {width: 10, height: 10} as OffscreenCanvas);

    expect(getContext).toHaveBeenCalledExactlyOnceWith('webgl2', {
      antialias: false,
      premultipliedAlpha: false,
    });
    expect(pixelStorei).not.toHaveBeenCalled();
  });

  it('rejects a drawing buffer smaller than the requested output', () => {
    mockRendererConstruction({drawingBufferSize: {width: 9, height: 10}});

    expect(() => {
      new WebGLRenderer(['fragment'], [[]], {width: 10, height: 10} as OffscreenCanvas);
    }).toThrow('WebGL drawing buffer size 9 x 10 does not match 10 x 10');
  });

  it('rejects source images that exceed the texture size limit', () => {
    mockRendererConstruction({maxTextureSize: 16});

    expect(() => {
      new WebGLRenderer(['fragment'], [[]], {width: 17, height: 10} as OffscreenCanvas, {
        size: {width: 10, height: 10},
      });
    }).toThrow('WebGL texture size 17 x 10 exceeds the limit 16 x 16');
  });

  it('rejects multiple render passes with multiple input images', () => {
    const textureArrayTarget = 0x8c1a;
    const renderer = Object.assign(Object.create(WebGLRenderer.prototype) as WebGLRenderer, {
      gl: {TEXTURE_2D_ARRAY: textureArrayTarget},
      imageTarget: textureArrayTarget,
    });

    expect(() => {
      renderer.render([{}, {}]);
    }).toThrow('Multiple input images do not support multiple render passes');
  });

  it('allocates a floating-point render target directly at the first pass size', () => {
    const {gl, renderer, texImage2D} = mockRenderer();
    const intermediateSize: ImageDimension = {width: 512, height: 400};

    renderer.render([{outputSize: intermediateSize}, {}]);

    expect(texImage2D).toHaveBeenCalledExactlyOnceWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA16F,
      intermediateSize.width,
      intermediateSize.height,
      0,
      gl.RGBA,
      gl.HALF_FLOAT,
      null
    );
  });

  it('keeps byte render targets for filters that do not request floating point', () => {
    const {gl, renderer, texImage2D} = mockRenderer({floatRenderTargets: false});

    renderer.render([{outputSize: {width: 512, height: 400}}, {}]);

    expect(texImage2D).toHaveBeenCalledExactlyOnceWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      512,
      400,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
  });

  it('accepts either color buffer extension for half-float render targets', () => {
    const image = {width: 10, height: 10} as OffscreenCanvas;
    const options = {floatRenderTargets: true};

    const {getExtension} = mockRendererConstruction();
    expect(new WebGLRenderer(['fragment'], [[]], image, options).floatRenderTargets).toBe(true);
    expect(getExtension).toHaveBeenCalledExactlyOnceWith('EXT_color_buffer_float');

    mockRendererConstruction({extensions: ['EXT_color_buffer_half_float']});
    expect(new WebGLRenderer(['fragment'], [[]], image, options).floatRenderTargets).toBe(true);

    mockRendererConstruction({extensions: []});
    expect(new WebGLRenderer(['fragment'], [[]], image, options).floatRenderTargets).toBe(false);
  });

  it('reuses the render targets across renders', () => {
    const {gl, renderer} = mockRenderer();

    renderer.render([{outputSize: {width: 512, height: 400}}, {}]);
    renderer.render([{outputSize: {width: 512, height: 400}}, {}]);

    expect(gl.createFramebuffer).toHaveBeenCalledOnce();
  });

  it('reuses the texture bound to a render pass unit across renders', () => {
    const {gl, renderer} = mockRenderer();
    const source = {width: 11, height: 1} as ImageData;
    const renderPass = {textures: [{name: 'u_colorMap', source}]};

    renderer.render([renderPass]);
    renderer.render([renderPass]);

    expect(gl.createTexture).toHaveBeenCalledOnce();
    expect(gl.texImage2D).toHaveBeenLastCalledWith(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source
    );
  });

  it('rejects render targets that exceed the texture size limit before allocation', () => {
    const {renderer, texImage2D} = mockRenderer();
    renderer.maxTextureSize = 511;

    expect(() => {
      renderer.render([{outputSize: {width: 512, height: 400}}, {}]);
    }).toThrow('WebGL texture size 512 x 400 exceeds the limit 511 x 511');
    expect(texImage2D).not.toHaveBeenCalled();
  });

  it('rejects render passes that exceed the viewport size limit', () => {
    const {renderer} = mockRenderer();
    renderer.maxViewportSize = {width: 599, height: 400};

    expect(() => {
      renderer.render();
    }).toThrow('WebGL viewport size 600 x 400 exceeds the limit 599 x 400');
  });

  it('rejects incomplete render target framebuffers', () => {
    const {renderer} = mockRenderer({framebufferStatus: 0x8cd6});

    expect(() => {
      renderer.render([{outputSize: {width: 512, height: 400}}, {}]);
    }).toThrow('WebGL framebuffer is incomplete: 0x8cd6');
  });

  it('revalidates a render target after resizing it for a later pass', () => {
    const {gl, renderer} = mockRenderer();

    renderer.render([
      {outputSize: {width: 500, height: 400}},
      {outputSize: {width: 400, height: 300}},
      {outputSize: {width: 300, height: 200}},
      {},
    ]);

    expect(gl.checkFramebufferStatus).toHaveBeenCalledTimes(3);
  });
});
