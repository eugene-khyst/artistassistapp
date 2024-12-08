#version 300 es

precision mediump float;

in vec2 v_texcoord;
uniform sampler2D u_texture;
uniform float u_thresholds[3];
uniform float u_colors[3];
layout (location = 0) out vec4 fragColor0;
layout (location = 1) out vec4 fragColor1;
layout (location = 2) out vec4 fragColor2;

#include linear-rgb.glsl;
#include oklab.glsl;

void main() {
  vec4 color = texture(u_texture, v_texcoord);
  vec3 oklab = rgbToOklab(color.rgb);
  vec4 resultColors[3] = vec4[3](vec4(1.0), vec4(1.0), vec4(1.0));
  for (int i = 0; i < resultColors.length(); i++) {
    for (int j = i; j >= 0; j--) {
      if (oklab.x <= u_thresholds[j]) {
        float value = u_colors[j];
        resultColors[i] = vec4(vec3(value), 1.0);
        break;
      }
    }
  }
  fragColor0 = resultColors[0];
  fragColor1 = resultColors[1];
  fragColor2 = resultColors[2];
}
