#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_original;
uniform float u_amount;
uniform float u_threshold;

in vec2 v_texCoord;
out vec4 fragColor;

#include unpremultiply.glsl

void main() {
  vec4 original = texture(u_original, v_texCoord);
  vec3 originalRgb = unpremultiply(original);
  vec3 blurredRgb = unpremultiply(texture(u_texture, v_texCoord));
  vec3 difference = originalRgb - blurredRgb;
  vec3 mask = step(vec3(u_threshold), abs(difference));
  vec3 sharpened = originalRgb + u_amount * difference * mask;
  fragColor = vec4(sharpened * original.a, original.a);
}
