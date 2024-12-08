#version 300 es

precision mediump float;

in vec2 v_texcoord;
uniform sampler2D u_texture;
uniform int u_radiuses[3];
uniform vec2 u_texelSize;
layout (location = 0) out vec4 fragColor0;
layout (location = 1) out vec4 fragColor1;
layout (location = 2) out vec4 fragColor2;

#include linear-rgb.glsl
#include luminance.glsl

vec4 medianColor(int radius) {
  vec3 colors[49]; // Support up to 7x7 kernel (radius = 3)
  int count = 0;

  for (int y = -radius; y <= radius; y++) {
    for (int x = -radius; x <= radius; x++) {
      vec2 offset = vec2(float(x), float(y)) * u_texelSize;
      vec2 sampleCoord = v_texcoord + offset;
      if (distance(v_texcoord, sampleCoord) <= float(radius) * length(u_texelSize)) {
        colors[count] = srgbToLinear(texture(u_texture, sampleCoord).rgb);
        count++;
      }
    }
  }

  for (int i = 0; i < count - 1; i++) {
    for (int j = 0; j < count - i - 1; j++) {
      float luminanceA = getLuminance(colors[j]);
      float luminanceB = getLuminance(colors[j + 1]);
      if (luminanceA > luminanceB) {
        vec3 temp = colors[j];
        colors[j] = colors[j + 1];
        colors[j + 1] = temp;
      }
    }
  }

  vec3 medianColor = colors[count / 2];
  return vec4(linearToSrgb(medianColor), 1.0);
}

void main() {
  for (int i = 0; i < u_radiuses.length(); i++) {
    vec4 resultColor = medianColor(u_radiuses[i]);
    switch (i) {
      case 0:
        fragColor0 = resultColor;
        break;
      case 1:
        fragColor1 = resultColor;
        break;
      case 2:
        fragColor2 = resultColor;
        break;
    }
  }
}
