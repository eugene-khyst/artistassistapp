/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import type {Size} from '~/src/utils/types';

import vertexShaderSource from './glsl/vertex.glsl';

export interface RenderPass {
  programIndex?: number;
  setUniforms?: (
    gl: WebGL2RenderingContext,
    locations: Map<string, WebGLUniformLocation | null>
  ) => void;
}

export class WebGLRenderer {
  canvas: OffscreenCanvas;
  gl: WebGL2RenderingContext;
  vertexShader: WebGLShader;
  fragmentShaders: WebGLShader[];
  programs: WebGLProgram[];
  vaos: WebGLVertexArrayObject[];
  buffers: (WebGLBuffer | null)[] = [];
  imageTexture: WebGLTexture | null;
  textures: (WebGLTexture | null)[] = [];
  framebuffers: (WebGLFramebuffer | null)[] = [];
  uniformLocations: Map<string, WebGLUniformLocation | null>[];

  constructor(
    fragmentShaderSources: string[],
    uniformNames: string[][],
    image: ImageBitmap | OffscreenCanvas,
    size?: Size | null
  ) {
    const [width, height] = size ?? [image.width, image.height];
    this.canvas = new OffscreenCanvas(width, height);
    const gl = this.canvas.getContext('webgl2', {antialias: false});
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

    this.vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);

    this.fragmentShaders = fragmentShaderSources.map(fragmentShaderSource =>
      this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource)
    );

    this.programs = this.fragmentShaders.map(fragmentShader =>
      this.linkProgram(this.vertexShader, fragmentShader)
    );

    this.vaos = this.programs.map(program => this.createVertexArray(program));

    this.uniformLocations = this.programs.map(
      (program, i) =>
        new Map(
          ['u_flipY', 'u_texture', ...(uniformNames[i] ?? [])!].map(name => [
            name,
            gl.getUniformLocation(program, name),
          ])
        )
    );

    this.imageTexture = this.createTexture(image);
  }

  private compileShader(type: GLenum, source: string) {
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
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program linking failed: ' + gl.getProgramInfoLog(program)!);
    }
    return program;
  }

  private createBuffer(data: number[]): WebGLBuffer | null {
    const {gl} = this;
    const buffer = gl.createBuffer();
    this.buffers.push(buffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
  }

  private setUpVertexAttributes(program: WebGLProgram, name: string, buffer: WebGLBuffer | null) {
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

    const positionBuffer = this.createBuffer([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    ]);
    const texcoordBuffer = this.createBuffer([
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    ]);

    this.setUpVertexAttributes(program, 'a_position', positionBuffer);
    this.setUpVertexAttributes(program, 'a_texCoord', texcoordBuffer);
    return vao;
  }

  private createTexture(source?: TexImageSource) {
    const {
      canvas: {width, height},
      gl,
    } = this;
    const texture = gl.createTexture();
    this.textures.push(texture);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (source) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    return texture;
  }

  private createFramebuffer(texture: WebGLTexture) {
    console.debug('Creating WebGL Framebuffer');
    const {gl} = this;
    const framebuffer = gl.createFramebuffer();
    this.framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    return framebuffer;
  }

  clear() {
    const {gl} = this;
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  render(renderPasses: RenderPass[] = [{}]) {
    const {gl} = this;
    const {width, height} = this.canvas;

    const textures =
      renderPasses.length > 1
        ? Array.from({length: Math.min(renderPasses.length - 1, 2)}).map(() => this.createTexture())
        : [];
    const framebuffers = textures.map(texture => this.createFramebuffer(texture));

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);

    let i = 0;
    for (const {programIndex = 0, setUniforms} of renderPasses) {
      const isNotLast = i < renderPasses.length - 1;

      const program = this.programs[programIndex]!;
      const vao = this.vaos[programIndex]!;
      const locations = this.uniformLocations[programIndex]!;

      gl.useProgram(program);
      gl.bindVertexArray(vao);

      gl.uniform1f(locations.get('u_flipY')!, framebuffers.length && isNotLast ? 0.0 : 1.0);
      gl.uniform1i(locations.get('u_texture')!, 0);
      if (setUniforms) {
        setUniforms(gl, locations);
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, isNotLast ? framebuffers[i % 2]! : null);
      gl.viewport(0, 0, width, height);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      gl.bindTexture(gl.TEXTURE_2D, isNotLast ? textures[i % 2]! : null);

      i++;
    }
    this.checkErrors();
  }

  cleanUp() {
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
