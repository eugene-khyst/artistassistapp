#version 300 es

precision mediump float;

uniform sampler2D u_texture;
uniform vec2 u_texelSize;
uniform int u_radius;

in vec2 v_texCoord;
out vec4 fragColor;

const int MAX_RADIUS = 5;

#include linear-rgb.glsl;
#include luminance.glsl;

struct QuadrantStats {
  vec3 mean;
  float variance;
};

QuadrantStats calculateQuadrantStats(int startX, int endX, int startY, int endY) {
  vec3 colorSum = vec3(0.0);
  float valueSum = 0.0;
  float valueSquareSum = 0.0;
  float count = 0.0;

  for (int x = startX; x <= endX; ++x) {
    for (int y = startY; y <= endY; ++y) {
      vec2 offset = vec2(float(x), float(y)) * u_texelSize;
      vec4 color = texture(u_texture, v_texCoord + offset);
      colorSum += color.rgb;
      float value = getLuminance(srgbToLinear(color.rgb));
      valueSum += value;
      valueSquareSum += value * value;
      count += 1.0;
    }
  }

  float valueMean = valueSum / count;
  float variance = (valueSquareSum / count) - (valueMean * valueMean);

  QuadrantStats stats;
  stats.mean = colorSum / count;
  stats.variance = variance;
  return stats;
}

void main() {
  fragColor = texture(u_texture, v_texCoord);

  int radius = min(u_radius, MAX_RADIUS);
  if (radius <= 0) {
    return;
  }

  QuadrantStats means[4];
  means[0] = calculateQuadrantStats(-radius, 0, -radius, 0);
  means[1] = calculateQuadrantStats(0, radius, 0, radius);
  means[2] = calculateQuadrantStats(-radius, 0, 0, radius);
  means[3] = calculateQuadrantStats(0, radius, -radius, 0);

  float minVariance = 1e10;
  vec3 result = vec3(0);

  for (int i = 0; i < 4; ++i) {
    if (means[i].variance < minVariance) {
      minVariance = means[i].variance;
      result = means[i].mean;
    }
  }

  fragColor = vec4(result, 1.0);
}
