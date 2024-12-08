const vec3 LUMINANCE_COEFFS = vec3(0.2126, 0.7152, 0.0722);

float getLuminance(vec3 rgb) {
  return dot(LUMINANCE_COEFFS, rgb);
}