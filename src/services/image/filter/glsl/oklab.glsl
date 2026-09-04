// Matrices come from color-constants.glsl, generated from the color mixer.

vec3 linearRgbToOklab(vec3 linear) {
  return LMS_TO_OKLAB * cbrt(LINEAR_RGB_TO_LMS * linear);
}

vec3 rgbToOklab(vec3 rgb) {
  return linearRgbToOklab(srgbToLinear(rgb));
}

// https://www.w3.org/TR/css-color-4/#GMA-Binary-local-MINDE
const float GAMUT_MAPPING_DELTA_E_JND = 0.02;
const float GAMUT_MAPPING_EPSILON = 0.0001;
const int GAMUT_MAPPING_MAX_STEPS = 24;

/** Rounded matrices push white a tiny bit past 1. Wider than the CPU value, for 32-bit floats. */
const float GAMUT_ROUND_OFF = 1e-4;

vec3 oklabToLinearRgb(vec3 oklab) {
  vec3 lms = OKLAB_TO_LMS * oklab;
  return LMS_TO_LINEAR_RGB * (lms * lms * lms);
}

bool isLinearRgbInGamut(vec3 linear) {
  return all(greaterThanEqual(linear, vec3(-GAMUT_ROUND_OFF))) &&
    all(lessThanEqual(linear, vec3(1.0 + GAMUT_ROUND_OFF)));
}

float deltaEOK(vec3 first, vec3 second) {
  return distance(first, second);
}

/** Reduces chroma at constant lightness and hue until the color fits, as writeGamutMappedRgb does. */
vec3 gamutMapLinearRgb(vec3 linear) {
  if (isLinearRgbInGamut(linear)) {
    return clamp(linear, 0.0, 1.0);
  }
  vec3 oklab = linearRgbToOklab(linear);
  if (oklab.x >= 1.0) {
    return vec3(1.0);
  }
  if (oklab.x <= 0.0) {
    return vec3(0.0);
  }
  float chroma = length(oklab.yz);
  vec2 hue = chroma == 0.0 ? vec2(1.0, 0.0) : oklab.yz / chroma;
  float low = 0.0;
  float high = chroma;
  bool lowInGamut = true;
  vec3 mapped = clamp(linear, 0.0, 1.0);
  if (deltaEOK(linearRgbToOklab(mapped), oklab) < GAMUT_MAPPING_DELTA_E_JND) {
    return mapped;
  }
  for (int step = 0; step < GAMUT_MAPPING_MAX_STEPS; step++) {
    if (high - low <= GAMUT_MAPPING_EPSILON) {
      break;
    }
    float current = 0.5 * (low + high);
    vec3 candidate = vec3(oklab.x, current * hue);
    vec3 candidateRgb = oklabToLinearRgb(candidate);
    if (lowInGamut && isLinearRgbInGamut(candidateRgb)) {
      low = current;
      continue;
    }
    mapped = clamp(candidateRgb, 0.0, 1.0);
    float deltaE = deltaEOK(linearRgbToOklab(mapped), candidate);
    if (deltaE < GAMUT_MAPPING_DELTA_E_JND) {
      if (GAMUT_MAPPING_DELTA_E_JND - deltaE < GAMUT_MAPPING_EPSILON) {
        return mapped;
      }
      lowInGamut = false;
      low = current;
    } else {
      high = current;
    }
  }
  return mapped;
}

vec3 oklabToRgb(vec3 oklab) {
  return linearToSrgb(gamutMapLinearRgb(oklabToLinearRgb(oklab)));
}
