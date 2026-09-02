#version 300 es

precision highp float;
precision highp int;

uniform sampler2D u_texture;
uniform ivec2 u_direction;
uniform float u_sourceScale;
uniform bool u_clampPremultipliedAlpha;

in vec2 v_texCoord;
out vec4 fragColor;

const float LANCZOS_RADIUS = 3.0;
const float PI = 3.14159265359;

float lanczosWeight(float distance) {
  if (distance == 0.0)
    return 1.0;
  if (abs(distance) >= LANCZOS_RADIUS)
    return 0.0;
  float piDistance = PI * distance;
  return (LANCZOS_RADIUS * sin(piDistance) * sin(piDistance / LANCZOS_RADIUS)) /
    (piDistance * piDistance);
}

void main() {
  ivec2 sourceSize = textureSize(u_texture, 0);
  vec2 sourcePixel = v_texCoord * vec2(sourceSize);
  float sourcePosition = dot(sourcePixel - 0.5, vec2(u_direction));
  float filterScale = max(u_sourceScale, 1.0);
  float support = LANCZOS_RADIUS * filterScale;
  int sourceLength = sourceSize.x * u_direction.x + sourceSize.y * u_direction.y;
  int firstSample = clamp(int(ceil(sourcePosition - support)), 0, sourceLength - 1);
  int lastSample = clamp(int(floor(sourcePosition + support)), 0, sourceLength - 1);
  // The perpendicular axis is not resized, so this index is exact.
  ivec2 perpendicularPixel = ivec2(sourcePixel) * (ivec2(1) - u_direction);

  vec4 color = vec4(0.0);
  float weightSum = 0.0;

  for (int sampleIndex = firstSample; sampleIndex <= lastSample; sampleIndex++) {
    float weight = lanczosWeight((sourcePosition - float(sampleIndex)) / filterScale);
    color += texelFetch(u_texture, perpendicularPixel + u_direction * sampleIndex, 0) * weight;
    weightSum += weight;
  }

  vec4 normalizedColor = color / weightSum;
  if (u_clampPremultipliedAlpha) {
    float alpha = clamp(normalizedColor.a, 0.0, 1.0);
    normalizedColor = vec4(clamp(normalizedColor.rgb, vec3(0.0), vec3(alpha)), alpha);
  }
  fragColor = normalizedColor;
}
