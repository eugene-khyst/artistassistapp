#version 300 es

precision mediump float;

uniform sampler2D u_texture;
in vec2 v_texCoord;
out vec4 fragColor;

#include linear-rgb.glsl;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  vec3 inverted = linearToSrgb(smoothstep(0.3, 0.7, 1.0 - srgbToLinear(color.rgb)));
  fragColor = vec4(inverted, color.a);
}