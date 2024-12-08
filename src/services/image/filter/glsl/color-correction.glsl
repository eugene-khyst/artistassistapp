#version 300 es

precision mediump float;

uniform sampler2D u_texture;
uniform vec3 u_invMaxValues;
uniform float u_saturation;

in vec2 v_texcoord;
out vec4 fragColor;

#include linear-rgb.glsl;
#include luminance.glsl;

void main() {
  vec4 color = texture(u_texture, v_texcoord);
  vec3 linearRgb = srgbToLinear(color.rgb);
  linearRgb = clamp(linearRgb * u_invMaxValues, 0.0, 1.0);
  linearRgb = mix(linearRgb, vec3(getLuminance(linearRgb)), 1.0 - u_saturation);
  fragColor = vec4(linearToSrgb(linearRgb), color.a);
}