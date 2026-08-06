#version 300 es
precision highp float;
precision highp sampler2DArray;

#define MAX_LAYERS 10

uniform sampler2DArray u_textures;

uniform int u_layerCount;
uniform float u_radiuses[MAX_LAYERS];
uniform vec2 u_center;

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec2 texSize = vec2(textureSize(u_textures, 0).xy);
  float dist = length(v_texCoord * texSize - u_center);
  float maxRadius = length(texSize) * 0.5;
  vec4 color = texture(u_textures, vec3(v_texCoord, 0.0));
  for (int i = 1; i < u_layerCount; i++) {
    float m = smoothstep(u_radiuses[i - 1] * maxRadius, u_radiuses[i] * maxRadius, dist);
    color = mix(color, texture(u_textures, vec3(v_texCoord, float(i))), m);
  }
  fragColor = color;
}
