vec3 unpremultiply(vec4 color) {
  return color.a > 0.0 ? color.rgb / color.a : vec3(0.0);
}