#version 300 es

uniform float u_flipY; // 0.0 = normal, 1.0 = flipped

in vec4 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  v_texCoord = vec2(a_texCoord.x, mix(a_texCoord.y, 1.0 - a_texCoord.y, u_flipY));
  gl_Position = a_position;
}