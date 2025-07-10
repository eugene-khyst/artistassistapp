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
  vec3 samples[9];
  int i = 0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y)) * u_texelSize;
      samples[i++] = texture(u_texture, v_texCoord + offset).rgb;
    }
  }

  float sumX = 0.0, sumY = 0.0;
  for (int i = 0; i < 9; i++) {
    vec3 oklab = rgbToOklab(samples[i]);
    sumX += G_X[i] * oklab.x;
    sumY += G_Y[i] * oklab.x;
  }

  float edge = sqrt(sumX * sumX + sumY * sumY);
  fragColor = vec4(vec3(1.0, 1.0, 1.0) - vec3(edge), 1.0);
}