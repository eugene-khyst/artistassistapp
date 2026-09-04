// Matrices and the white point come from color-constants.glsl, generated from the color mixer.

vec3 linearRgbToXyz(vec3 linear) {
  return LINEAR_RGB_TO_XYZ * linear;
}

vec3 xyzToLinearRgb(vec3 xyz) {
  return XYZ_TO_LINEAR_RGB * xyz;
}

vec3 rgbToXyz(vec3 rgb) {
  return LINEAR_RGB_TO_XYZ * srgbToLinear(rgb);
}

/** Gamut-maps like the TypeScript `xyzToRgb`. Clipping each channel would shift the hue. */
vec3 xyzToRgb(vec3 xyz) {
  return linearToSrgb(gamutMapLinearRgb(XYZ_TO_LINEAR_RGB * xyz));
}
