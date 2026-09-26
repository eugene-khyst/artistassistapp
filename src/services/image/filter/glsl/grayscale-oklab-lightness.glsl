#version 300 es
precision highp float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
out vec4 fragColor;

#include color-constants.glsl
#include linear-rgb.glsl
#include oklab.glsl

void main() {
  float l = rgbToOklab(texture(u_texture, v_texCoord).rgb).x;
  fragColor = vec4(l, 0.0, 0.0, 1.0);
}
