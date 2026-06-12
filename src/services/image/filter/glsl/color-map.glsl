#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_colorMap;

in vec2 v_texCoord;
out vec4 fragColor;

#include linear-rgb.glsl
#include oklab.glsl

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float l = clamp(rgbToOklab(color.rgb).x, 0.0, 1.0);

  float colorMapWidth = float(textureSize(u_colorMap, 0).x);
  float colorMapX = mix(0.5 / colorMapWidth, 1.0 - 0.5 / colorMapWidth, l);
  vec4 mappedColor = texture(u_colorMap, vec2(colorMapX, 0.5));

  fragColor = vec4(mappedColor.rgb, color.a);
}
