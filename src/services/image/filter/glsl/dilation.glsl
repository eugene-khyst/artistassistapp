#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform int u_kernelSize;
uniform vec2 u_direction; // (1.0, 0.0) for horizontal; (0.0, 1.0) for vertical

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec3 maxColor = vec3(0.0);
  int radius = (u_kernelSize - 1) / 2;
  for (int i = 0; i < u_kernelSize; i++) {
    vec2 samplePos = v_texCoord + float(i - radius) * u_direction * u_texelSize;
    maxColor = max(maxColor, texture(u_texture, samplePos).rgb);
  }
  fragColor = vec4(maxColor, 1.0);
}
