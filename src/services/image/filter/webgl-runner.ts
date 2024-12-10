/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import vertexShaderSource from './glsl/vertex.glsl';

export class WebGLShaderRunner {
  canvas: OffscreenCanvas;
  gl: WebGL2RenderingContext;
  vertexShader: WebGLShader;
  fragmentShader: WebGLShader;
  program: WebGLProgram;
  buffers: (WebGLBuffer | null)[] = [];
  textures: (WebGLTexture | null)[] = [];

  constructor(
    fragmentShaderSource: string,
    public width: number,
    public height: number
  ) {
    this.canvas = new OffscreenCanvas(width, height);
    const gl = this.canvas.getContext('webgl2', {antialias: false});
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;

    this.vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    this.fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = this.linkProgram(this.vertexShader, this.fragmentShader);
    gl.useProgram(this.program);

    const positionBuffer = this.createBuffer([
      -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
    ]);
    this.buffers.push(positionBuffer);
    const texcoordBuffer = this.createBuffer([
      0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
    ]);
    this.buffers.push(texcoordBuffer);

    this.setUpVertexAttributes('a_position', positionBuffer);
    this.setUpVertexAttributes('a_texcoord', texcoordBuffer);

    const textureLocation = gl.getUniformLocation(this.program, 'u_texture');
    gl.uniform1i(textureLocation, 0);
  }

  private compileShader(type: GLenum, source: string) {
    const {gl} = this;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Vertex shader compilation failed: ' + gl.getShaderInfoLog(shader)!);
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
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return buffer;
  }

  private setUpVertexAttributes(name: string, buffer: WebGLBuffer | null) {
    const {gl, program} = this;
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  }

  createTexture(source: TexImageSource) {
    const {gl, width, height} = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    this.textures.push(texture);
    return texture;
  }

  clear() {
    const {gl} = this;
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  draw() {
    const {gl} = this;
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.checkErrors();
  }

  transferToImageBitmap(): ImageBitmap {
    this.gl.finish();
    const imageBitmap = this.canvas.transferToImageBitmap();
    this.checkErrors();
    this.checkContextLoss();
    return imageBitmap;
  }

  cleanUp() {
    const {gl} = this;
    this.textures.forEach(texture => {
      gl.deleteTexture(texture);
    });
    this.buffers.forEach(buffer => {
      gl.deleteBuffer(buffer);
    });
    gl.deleteProgram(this.program);
    gl.deleteShader(this.vertexShader);
    gl.deleteShader(this.fragmentShader);
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
