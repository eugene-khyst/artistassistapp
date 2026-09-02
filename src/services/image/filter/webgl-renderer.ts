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

import {getBoundingSize} from '@/utils/graphics';
import type {Size} from '@/utils/types';

import vertexShaderSource from './glsl/vertex.glsl';

export interface RenderPass {
  programIndex?: number;
  outputSize?: Size;
  textures?: RenderPassTexture[];
  setUniforms?: (
    gl: WebGL2RenderingContext,
    locations: Map<string, WebGLUniformLocation | null>
  ) => void;
}

export interface RenderPassTexture {
  name: string;
  source: TexImageSource;
  unit?: number;
}

interface RenderTarget {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  size: Size;
}

interface Options {
  floatRenderTargets?: boolean;
  premultiplyAlpha?: boolean;
  size?: Size;
}

const PING_PONG_RENDER_TARGET_COUNT = 2;

export class WebGLRenderer {
  canvas: OffscreenCanvas;
  gl: WebGL2RenderingContext;
  vertexShader: WebGLShader;
  fragmentShaders: WebGLShader[];
  programs: WebGLProgram[];
  vaos: WebGLVertexArrayObject[];
  buffers: (WebGLBuffer | null)[] = [];
  imageTexture: WebGLTexture;
  imageTarget: GLenum;
  textureUniformName: string;
  textures: WebGLTexture[] = [];
  framebuffers: (WebGLFramebuffer | null)[] = [];
  texturesByUnit = new Map<number, WebGLTexture>();
  renderTargets: RenderTarget[] = [];
  uniformLocations: Map<string, WebGLUniformLocation | null>[];
  readonly floatRenderTargets: boolean;
  readonly maxTextureSize: number;
  readonly maxViewportSize: Size;

  constructor(
    fragmentShaderSources: string[],
    uniformNames: string[][],
    images: OffscreenCanvas | OffscreenCanvas[],
    {floatRenderTargets = false, premultiplyAlpha = false, size}: Options = {}
  ) {
    const imagesArr = [images].flat();
    const [width, height] = size ?? getBoundingSize(imagesArr) ?? [0, 0];
    validateSize([width, height], 'renderer output');
    this.canvas = new OffscreenCanvas(width, height);
    const gl: WebGL2RenderingContext | null = this.canvas.getContext('webgl2', {
      antialias: false,
      premultipliedAlpha: premultiplyAlpha,
    });
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    // Either extension renders RGBA16F.
    this.floatRenderTargets =
      floatRenderTargets &&
      (!!gl.getExtension('EXT_color_buffer_float') ||
        !!gl.getExtension('EXT_color_buffer_half_float'));
    if (floatRenderTargets && !this.floatRenderTargets) {
      console.warn('Floating-point render targets are not supported; using 8-bit render targets');
    }
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    const maxViewportSize = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;
    this.maxViewportSize = [maxViewportSize[0]!, maxViewportSize[1]!];
    this.validateViewportSize([width, height]);
    if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) {
      throw new Error(
        `WebGL drawing buffer size ${gl.drawingBufferWidth} x ${gl.drawingBufferHeight} does not match ${width} x ${height}`
      );
    }
    imagesArr.forEach(image => {
      this.validateTextureSize([image.width, image.height]);
    });
    if (premultiplyAlpha) {
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    }

    this.vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);

    this.fragmentShaders = fragmentShaderSources.map(fragmentShaderSource =>
      this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
    );

    this.programs = this.fragmentShaders.map(fragmentShader =>
      this.linkProgram(this.vertexShader, fragmentShader)
    );

    this.vaos = this.programs.map(program => this.createVertexArray(program));

    const isTextureArray = imagesArr.length > 1;
    this.imageTarget = isTextureArray ? gl.TEXTURE_2D_ARRAY : gl.TEXTURE_2D;
    this.textureUniformName = isTextureArray ? 'u_textures' : 'u_texture';

    this.uniformLocations = this.programs.map(
      (program, i) =>
        new Map(
          ['u_flipY', this.textureUniformName, ...(uniformNames[i] ?? [])].map(name => [
            name,
            gl.getUniformLocation(program, name),
          ])
        )
    );

    this.imageTexture = isTextureArray
      ? this.createArrayTexture(imagesArr)
      : this.createTexture(imagesArr[0]);
  }

  private compileShader(type: GLenum, source: string): WebGLShader {
    const {gl} = this;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compilation failed: ' + gl.getShaderInfoLog(shader)!);
    }
    return shader;
  }

  private linkProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const {gl} = this;
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program linking failed: ' + gl.getProgramInfoLog(program)!);
    }
    return program;
  }

  private createBuffer(data: number[]): WebGLBuffer {
    const {gl} = this;
    const buffer = gl.createBuffer();
    this.buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
  }

  private setUpVertexAttributes(
    program: WebGLProgram,
    name: string,
    buffer: WebGLBuffer | null
  ): void {
    const {gl} = this;
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  }

  private createVertexArray(program: WebGLProgram): WebGLVertexArrayObject {
    const {gl} = this;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const positionBuffer = this.createBuffer([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const texcoordBuffer = this.createBuffer([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

    this.setUpVertexAttributes(program, 'a_position', positionBuffer);
    this.setUpVertexAttributes(program, 'a_texCoord', texcoordBuffer);
    return vao;
  }

  private createTexture(source?: TexImageSource): WebGLTexture {
    const {gl} = this;
    const texture = gl.createTexture();
    this.textures.push(texture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
    return texture;
  }

  private createArrayTexture(sources: OffscreenCanvas[]): WebGLTexture {
    const {gl} = this;
    const [width, height] = getBoundingSize(sources)!;
    const texture = gl.createTexture();
    this.textures.push(texture);
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, width, height, sources.length);
    sources.forEach((source, layer) => {
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        layer,
        width,
        height,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        source
      );
    });
    return texture;
  }

  private createFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
    const {gl} = this;
    const framebuffer = gl.createFramebuffer();
    this.framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    this.validateFramebuffer();
    return framebuffer;
  }

  private validateFramebuffer(): void {
    const {gl} = this;
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`WebGL framebuffer is incomplete: 0x${status.toString(16)}`);
    }
  }

  private validateTextureSize(size: Size): void {
    validateSizeWithinLimit(size, [this.maxTextureSize, this.maxTextureSize], 'texture');
  }

  private validateViewportSize(size: Size): void {
    validateSizeWithinLimit(size, this.maxViewportSize, 'viewport');
  }

  private createRenderTarget(size: Size): RenderTarget {
    const texture = this.createTexture();
    this.setRenderTargetTextureSize(texture, size);
    return {
      texture,
      framebuffer: this.createFramebuffer(texture),
      size,
    };
  }

  private setRenderTargetTextureSize(texture: WebGLTexture, [width, height]: Size): void {
    const {gl} = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (this.floatRenderTargets) {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
      return;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }

  private setRenderTargetSize(renderTarget: RenderTarget, size: Size): void {
    const [currentWidth, currentHeight] = renderTarget.size;
    const [width, height] = size;
    if (currentWidth === width && currentHeight === height) {
      return;
    }
    this.setRenderTargetTextureSize(renderTarget.texture, size);
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, renderTarget.framebuffer);
    this.validateFramebuffer();
    renderTarget.size = size;
  }

  private bindRenderPassTextures(
    renderPassTextures: RenderPassTexture[] | undefined,
    locations: Map<string, WebGLUniformLocation | null>
  ): void {
    if (!renderPassTextures?.length) {
      return;
    }

    const {gl} = this;
    const maxTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) as number;
    renderPassTextures.forEach(({name, source, unit}, i) => {
      const textureUnit = unit ?? 1 + i;
      if (textureUnit < 1) {
        throw new Error('Texture unit 0 is reserved for the source image');
      }
      if (textureUnit >= maxTextureUnits) {
        throw new Error(`Texture unit ${textureUnit} exceeds the WebGL limit ${maxTextureUnits}`);
      }

      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      const texture = this.texturesByUnit.get(textureUnit);
      if (texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      } else {
        this.texturesByUnit.set(textureUnit, this.createTexture(source));
      }
      gl.uniform1i(locations.get(name)!, textureUnit);
    });
    gl.activeTexture(gl.TEXTURE0);
  }

  clear(): void {
    const {gl} = this;
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  render(renderPasses: RenderPass[] = [{}], rawOrientation = false) {
    const {gl} = this;
    if (!renderPasses.length) {
      throw new Error('At least one render pass is required');
    }
    if (this.imageTarget === gl.TEXTURE_2D_ARRAY && renderPasses.length > 1) {
      throw new Error('Multiple input images do not support multiple render passes');
    }

    const {width, height} = this.canvas;
    const canvasSize: Size = [width, height];
    const outputSizes = renderPasses.map(({outputSize}) => outputSize ?? canvasSize);
    const finalOutputSize = outputSizes.at(-1)!;
    if (finalOutputSize[0] !== width || finalOutputSize[1] !== height) {
      throw new Error('The final render pass size must match the renderer output size');
    }
    outputSizes.forEach((outputSize, index) => {
      this.validateViewportSize(outputSize);
      if (index < outputSizes.length - 1) {
        this.validateTextureSize(outputSize);
      }
    });

    const renderTargetCount =
      renderPasses.length > 1
        ? Math.min(renderPasses.length - 1, PING_PONG_RENDER_TARGET_COUNT)
        : 0;
    while (this.renderTargets.length < renderTargetCount) {
      this.renderTargets.push(this.createRenderTarget(outputSizes[this.renderTargets.length]!));
    }

    let sourceTextureTarget = this.imageTarget;
    let sourceTexture = this.imageTexture;

    for (const [index, renderPass] of renderPasses.entries()) {
      const {programIndex = 0, textures: renderPassTextures, setUniforms} = renderPass;
      const isLast = index === renderPasses.length - 1;
      const outputSize = outputSizes[index]!;
      const [passWidth, passHeight] = outputSize;

      const renderTarget = isLast ? undefined : this.renderTargets[index % renderTargetCount]!;
      if (renderTarget) {
        this.setRenderTargetSize(renderTarget, outputSize);
      }

      const program = this.programs[programIndex]!;
      const vao = this.vaos[programIndex]!;
      const locations = this.uniformLocations[programIndex]!;

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(sourceTextureTarget, sourceTexture);
      gl.uniform1f(locations.get('u_flipY')!, !isLast || rawOrientation ? 0 : 1);
      gl.uniform1i(locations.get(this.textureUniformName)!, 0);
      this.bindRenderPassTextures(renderPassTextures, locations);
      setUniforms?.(gl, locations);

      gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget?.framebuffer ?? null);
      gl.viewport(0, 0, passWidth, passHeight);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      if (renderTarget) {
        sourceTextureTarget = gl.TEXTURE_2D;
        sourceTexture = renderTarget.texture;
      }
    }
    this.checkErrors();
  }

  readPixels(): Uint8Array {
    const {
      gl,
      canvas: {width, height},
    } = this;
    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }

  cleanUp(): void {
    const {gl, canvas} = this;
    this.framebuffers.forEach(framebuffer => {
      gl.deleteFramebuffer(framebuffer);
    });
    this.textures.forEach(texture => {
      gl.deleteTexture(texture);
    });
    this.vaos.forEach(vao => {
      gl.deleteVertexArray(vao);
    });
    this.buffers.forEach(buffer => {
      gl.deleteBuffer(buffer);
    });
    this.programs.forEach(program => {
      gl.deleteProgram(program);
    });
    this.fragmentShaders.forEach(fragmentShader => {
      gl.deleteShader(fragmentShader);
    });
    gl.deleteShader(this.vertexShader);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.width = 0;
    canvas.height = 0;
  }

  checkErrors(): void {
    const error = this.gl.getError();
    if (error !== this.gl.NO_ERROR) {
      throw new Error(`WebGL Error: ${error}`);
    }
  }

  checkContextLoss(): void {
    if (this.gl.isContextLost()) {
      throw new Error('WebGL context was lost');
    }
  }
}

function validateSize([width, height]: Size, name: string): void {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid ${name} size: ${width} x ${height}`);
  }
}

function validateSizeWithinLimit(size: Size, limit: Size, name: string): void {
  validateSize(size, name);
  const [width, height] = size;
  const [maxWidth, maxHeight] = limit;
  if (width > maxWidth || height > maxHeight) {
    throw new Error(
      `WebGL ${name} size ${width} x ${height} exceeds the limit ${maxWidth} x ${maxHeight}`
    );
  }
}
