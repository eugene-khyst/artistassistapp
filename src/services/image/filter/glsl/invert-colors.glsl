#version 300 es

precision mediump float;

uniform sampler2D u_texture;
in vec2 v_texCoord;
out vec4 fragColor;

const float K = 15.0;

vec3 sigmoid(vec3 x, float k) {
  return 1.0 / (1.0 + exp(-k * (x - 0.5)));
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  vec3 inverted = sigmoid(1.0 - color.rgb, K);
  fragColor = vec4(inverted, color.a);
}