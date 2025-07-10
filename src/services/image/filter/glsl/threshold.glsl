#version 300 es

precision highp float;

uniform sampler2D u_texture;
uniform float u_thresholds[3];
uniform float u_values[3];
uniform int u_tone;

in vec2 v_texCoord;
out vec4 fragColor;

#include linear-rgb.glsl;
#include oklab.glsl;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  vec3 oklab = rgbToOklab(color.rgb);
  fragColor = vec4(1.0);
  for (int i = u_tone; i >= 0; i--) {
    if (oklab.x <= u_thresholds[i]) {
      float value = u_values[i];
      fragColor = vec4(vec3(value), 1.0);
      break;
    }
  }
}
