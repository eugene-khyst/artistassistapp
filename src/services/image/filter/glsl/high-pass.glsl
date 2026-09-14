#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_original;
uniform float u_contrast;

in vec2 v_texCoord;
out vec4 fragColor;

#include unpremultiply.glsl
#include hard-light.glsl

void main() {
  vec4 original = texture(u_original, v_texCoord);
  vec3 originalRgb = unpremultiply(original);
  vec3 blurredRgb = unpremultiply(texture(u_texture, v_texCoord));
  vec3 highPass = clamp(vec3(0.5) + 0.5 * u_contrast * (originalRgb - blurredRgb), 0.0, 1.0);
  vec3 sharpened = hardLight(originalRgb, highPass);
  fragColor = vec4(sharpened * original.a, original.a);
}
