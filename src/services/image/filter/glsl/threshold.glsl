#version 300 es
precision highp float;

uniform sampler2D u_texture;
uniform float u_thresholds[3];
uniform float u_values[3];
uniform int u_tone;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  float l = texture(u_texture, v_texCoord).r;
  float w = max(fwidth(l), 1e-5);

  vec3 toneColor = vec3(1.0);

  for (int i = 0; i <= u_tone; i++) {
    float toneBlend = smoothstep(u_thresholds[i] - w, u_thresholds[i] + w, l);
    toneColor = mix(vec3(u_values[i]), toneColor, toneBlend);
  }

  fragColor = vec4(toneColor, 1.0);
}
