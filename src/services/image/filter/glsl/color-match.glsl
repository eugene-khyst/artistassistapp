#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform vec3 u_oklab;
uniform float u_threshold;

in vec2 v_texCoord;
out vec4 fragColor;

#include linear-rgb.glsl;
#include oklab.glsl;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float deltaEOk = length(rgbToOklab(color.rgb) - u_oklab);
  fragColor = (deltaEOk <= u_threshold) ? color : vec4(0.0f);
}
