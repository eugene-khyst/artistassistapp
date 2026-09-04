// The coefficients come from color-constants.glsl, generated from the color mixer.

/** Takes linear RGB, so the answer is the Y of `rgbToXyz`. */
float getLuminance(vec3 linear) {
  return dot(LINEAR_RGB_TO_LUMINANCE, linear);
}
