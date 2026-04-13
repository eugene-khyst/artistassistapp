#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;

in vec2 v_texCoord;
out vec4 fragColor;

#include linear-rgb.glsl;
#include oklab.glsl;

const float G_X[9] = float[9](-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0);
const float G_Y[9] = float[9](-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);

void main() {
  float sumX = 0.0;
  float sumY = 0.0;
  int i = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y)) * u_texelSize;
      float l = rgbToOklab(texture(u_texture, v_texCoord + offset).rgb).x;
      sumX += G_X[i] * l;
      sumY += G_Y[i] * l;
      i++;
    }
  }
  fragColor = vec4(abs(sumX) * 0.25, abs(sumY) * 0.25, 0.0, 1.0);
}
