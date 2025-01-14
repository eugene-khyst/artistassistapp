#version 300 es

in vec4 a_position;
in vec2 a_texcoord;
out vec2 v_texCoord;

void main() {
  // v_texCoord = a_texcoord;
  v_texCoord = vec2(a_texcoord.x, 1.0 - a_texcoord.y);
  gl_Position = a_position;
}