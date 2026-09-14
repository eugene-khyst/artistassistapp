vec3 hardLight(vec3 backdrop, vec3 source) {
  vec3 multiplied = 2.0 * backdrop * source;
  vec3 screened = 1.0 - 2.0 * (1.0 - backdrop) * (1.0 - source);
  return mix(multiplied, screened, step(vec3(0.5), source));
}