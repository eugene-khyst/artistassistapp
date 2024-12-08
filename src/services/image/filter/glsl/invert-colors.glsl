#version 300 es

precision mediump float;

in vec2 v_texcoord;
uniform sampler2D u_texture;
out vec4 fragColor;

void main() {
  vec4 color = texture(u_texture, v_texcoord);
  fragColor = vec4(vec3(1.0) - color.rgb, 1.0);
}
