#version 300 es

precision highp float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec2 srcSize = vec2(textureSize(u_texture, 0));
  vec2 texCoord = mix(0.5 / srcSize, 1.0 - 0.5 / srcSize, v_texCoord);
  fragColor = texture(u_texture, texCoord);
}
