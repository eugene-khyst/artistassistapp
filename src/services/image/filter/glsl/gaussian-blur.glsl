#version 300 es
precision highp float;

const int MAX_KERNEL_SIZE = 25;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform float u_kernel[MAX_KERNEL_SIZE];
uniform int u_kernelSize;
uniform vec2 u_direction; // (1.0, 0.0) for horizontal; (0.0, 1.0) for vertical

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 color = vec4(0.0);
  int radius = (u_kernelSize - 1) / 2;
  for (int i = 0; i < u_kernelSize; i++) {
    int offset = i - radius;
    vec2 samplePos = v_texCoord + (float(offset) * u_direction * u_texelSize);
    color += texture(u_texture, samplePos) * u_kernel[i];
  }
  fragColor = color;
}