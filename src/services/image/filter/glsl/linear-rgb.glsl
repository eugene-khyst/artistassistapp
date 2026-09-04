vec3 srgbToLinear(vec3 srgb) {
  bvec3 cutoff = lessThan(srgb, vec3(0.04045));
  vec3 higher = pow(max(srgb + vec3(0.055), vec3(0.0)) / vec3(1.055), vec3(2.4));
  vec3 lower = srgb / vec3(12.92);
  return mix(higher, lower, cutoff);
}

vec3 linearToSrgb(vec3 linear) {
  bvec3 cutoff = lessThan(linear, vec3(0.0031308));
  vec3 higher = vec3(1.055) * pow(max(linear, vec3(0.0)), vec3(1.0 / 2.4)) - vec3(0.055);
  vec3 lower = linear * vec3(12.92);
  return mix(higher, lower, cutoff);
}

/** Keeps the sign, as Math.cbrt does. pow() is undefined for a negative base. */
vec3 cbrt(vec3 value) {
  return sign(value) * pow(abs(value), vec3(1.0 / 3.0));
}
