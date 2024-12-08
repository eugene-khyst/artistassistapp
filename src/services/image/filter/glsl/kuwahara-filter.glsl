#version 300 es

precision mediump float;

#define MAX_RADIUS      5
#define MAX_KERNEL_SIZE ((MAX_RADIUS * 2 + 1) * (MAX_RADIUS * 2 + 1))

uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform int u_radius;

in vec2 v_texcoord;
out vec4 fragColor;

float values[MAX_KERNEL_SIZE];
vec4 mean = vec4(0.0);
float valueMean = 0.0;
float minVariance = -1.0;

#include linear-rgb.glsl;
#include luminance.glsl;

void findMean(int i0, int i1, int j0, int j1) {
  vec4 meanTemp = vec4(0.0);
  float variance = 0.0;
  int count = 0;

  for (int i = i0; i <= i1; ++i) {
    for (int j = j0; j <= j1; ++j) {
      vec2 offset = vec2(float(i), float(j)) * u_texelSize;
      vec4 color = texture(u_texture, v_texcoord + offset);
      meanTemp += color;
      values[count++] = getLuminance(srgbToLinear(color.rgb));
    }
  }

  meanTemp.rgb /= float(count);
  valueMean = getLuminance(srgbToLinear(meanTemp.rgb));

  for (int i = 0; i < count; ++i) {
    variance += pow(values[i] - valueMean, 2.0);
  }

  variance /= float(count);

  if (variance < minVariance || minVariance <= -1.0) {
    mean = meanTemp;
    minVariance = variance;
  }
}

void main() {
  fragColor = texture(u_texture, v_texcoord);

  int radius = min(u_radius, MAX_RADIUS);
  if (radius <= 0) {
    return;
  }

  findMean(-radius, 0, -radius, 0);
  findMean(0, radius, 0, radius);
  findMean(-radius, 0, 0, radius);
  findMean(0, radius, -radius, 0);

  fragColor.rgb = mean.rgb;
}
