#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_thresholds[3];
uniform float u_values[3];
uniform int u_tone;
uniform bool u_grayscale;

in vec2 v_texCoord;
out vec4 fragColor;

#include linear-rgb.glsl
#include oklab.glsl

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  float l = u_grayscale ? color.r : rgbToOklab(color.rgb).x;
  float w = fwidth(l);

  vec3 toneColor = vec3(1.0);

  for (int i = 0; i <= u_tone; i++) {
    float toneBlend = smoothstep(u_thresholds[i] - w, u_thresholds[i] + w, l);
    toneColor = mix(vec3(u_values[i]), toneColor, toneBlend);
  }

  fragColor = vec4(toneColor, 1.0);
}
