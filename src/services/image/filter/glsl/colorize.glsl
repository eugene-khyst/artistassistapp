#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_a;
uniform sampler2D u_b;

in vec2 v_texCoord;
out vec4 fragColor;

#include color-constants.glsl
#include linear-rgb.glsl
#include oklab.glsl
#include xyz.glsl
#include lab.glsl

/**
 * Bilinear sampling that matches bilinear-interpolation.ts: source coordinate
 * (dst + 0.5) * scale - 0.5, with replicate-edge clamping. texelFetch is used so this does not
 * depend on float textures being filterable.
 */
float sampleChannel(sampler2D channel, vec2 texCoord) {
  ivec2 size = textureSize(channel, 0);
  vec2 source = texCoord * vec2(size) - 0.5;
  vec2 base = floor(source);
  vec2 fraction = source - base;
  ivec2 low = clamp(ivec2(base), ivec2(0), size - 1);
  ivec2 high = clamp(ivec2(base) + 1, ivec2(0), size - 1);
  float topLeft = texelFetch(channel, low, 0).r;
  float topRight = texelFetch(channel, ivec2(high.x, low.y), 0).r;
  float bottomLeft = texelFetch(channel, ivec2(low.x, high.y), 0).r;
  float bottomRight = texelFetch(channel, high, 0).r;
  return mix(mix(topLeft, topRight, fraction.x), mix(bottomLeft, bottomRight, fraction.x), fraction.y);
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float lightness = rgbToLab(color.rgb).x;
  vec3 lab = vec3(lightness, sampleChannel(u_a, v_texCoord), sampleChannel(u_b, v_texCoord));
  fragColor = vec4(labToRgb(lab), color.a);
}
