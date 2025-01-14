#version 300 es

precision mediump float;

uniform sampler2D u_texture;

in vec2 v_texCoord;
out vec4 fragColor;

const float LANCZOS_A = 3.0;
const float PI = 3.14159265359;

float lanczos(float x) {
  if (x == 0.0)
    return 1.0;
  if (abs(x) >= LANCZOS_A)
    return 0.0;
  float pi_x = PI * x;
  return (LANCZOS_A * sin(pi_x) * sin(pi_x / LANCZOS_A)) / (pi_x * pi_x);
}

void main() {
  vec2 texSize = vec2(textureSize(u_texture, 0));
  vec2 pixel = v_texCoord * texSize;
  vec2 center = floor(pixel - 0.5) + 0.5;

  vec4 color = vec4(0.0);
  float weightSum = 0.0;

  for (float y = -LANCZOS_A + 1.0; y <= LANCZOS_A; y++) {
    for (float x = -LANCZOS_A + 1.0; x <= LANCZOS_A; x++) {
      vec2 samplePos = center + vec2(y, x);
      vec2 sampleCoord = samplePos / texSize;

      float dx = pixel.x - samplePos.x;
      float dy = pixel.y - samplePos.y;
      float weight = lanczos(dx) * lanczos(dy);

      color += texture(u_texture, sampleCoord) * weight;
      weightSum += weight;
    }
  }

  fragColor = color / weightSum;
}