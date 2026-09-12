#version 300 es
precision highp float;
precision highp sampler2DArray;

// The brushes are premultiplied, so mip levels and blending keep the stroke edges clean.
uniform sampler2DArray u_textures;
uniform highp sampler2D u_parameters;
uniform int u_parametersPerStroke;
uniform int u_renderSize;
uniform float u_strokeScale;

in vec2 v_texCoord;
out vec4 fragColor;

float parameter(int stroke, int component) {
  return texelFetch(u_parameters, ivec2(stroke * u_parametersPerStroke + component, 0), 0).r;
}

void main() {
  int strokes = textureSize(u_parameters, 0).x / u_parametersPerStroke;
  float pixel = 1.0 / float(u_renderSize);
  vec4 color = vec4(0.0);
  for (int stroke = 0; stroke < strokes; stroke++) {
    vec2 center = vec2(parameter(stroke, 0), parameter(stroke, 1));
    center = center * u_strokeScale + (1.0 - u_strokeScale) * 0.5;
    vec2 size = vec2(parameter(stroke, 2), parameter(stroke, 3)) * u_strokeScale;
    if (any(lessThanEqual(size, vec2(0.0)))) {
      continue;
    }
    float angle = parameter(stroke, 4) * 3.141592653589793;
    float sine = sin(angle);
    float cosine = cos(angle);
    mat2 rotation = mat2(cosine, -sine, sine, cosine);
    vec2 uv = rotation * (v_texCoord - center) / size + 0.5;
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) {
      continue;
    }
    int layer = size.y > size.x ? 0 : 1;
    // A stroke shrinks the brush by a different amount along each axis, so both gradients are given.
    vec4 brush = textureGrad(
      u_textures,
      vec3(uv, layer),
      rotation * vec2(pixel, 0.0) / size,
      rotation * vec2(0.0, pixel) / size
    );
    vec4 paint = vec4(
      brush.r * vec3(parameter(stroke, 5), parameter(stroke, 6), parameter(stroke, 7)),
      brush.a
    );
    color = paint + color * (1.0 - paint.a);
  }
  fragColor = color;
}
